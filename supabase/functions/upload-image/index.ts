// BarSafe · upload-image
// Stores a (client-compressed) image in the public "media" bucket and returns its URL.
// Who may upload:
//   - a signed-in OWNER account (bar creation wizard)        -> Authorization: Bearer <user JWT>
//   - a Direction staff session (product photos, dashboard)  -> form field "token"
// Deploy: supabase functions deploy upload-image  (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected)
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 1024 * 1024; // matches the bucket limit
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const KINDS = new Set(['logo', 'cover', 'product']);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Méthode non autorisée.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reply(400, { error: 'Requête invalide.' });
  }
  const file = form.get('file');
  const kind = String(form.get('kind') || '');
  const staffToken = String(form.get('token') || '');

  if (!(file instanceof File)) return reply(400, { error: 'Aucune image reçue.' });
  if (!KINDS.has(kind)) return reply(400, { error: 'Type d’image inconnu.' });
  if (!TYPES[file.type]) return reply(415, { error: 'Format non pris en charge (WebP, JPEG ou PNG).' });
  if (file.size > MAX_BYTES) return reply(413, { error: 'Image trop lourde (1 Mo maximum).' });

  // ---- Who is uploading? ----
  let folder: string | null = null;

  if (staffToken) {
    const { data } = await admin
      .from('staff_sessions')
      .select('establishment_id, role, expires_at')
      .eq('token', staffToken)
      .maybeSingle();
    if (data && data.role === 'PATRON' && new Date(data.expires_at) > new Date()) {
      folder = `bars/${data.establishment_id}`;
    }
  } else {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: userData } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
    const user = userData?.user;
    if (user) {
      const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role === 'OWNER') folder = `owners/${user.id}`;
    }
  }

  if (!folder) return reply(403, { error: 'Envoi d’image réservé à la direction de l’établissement.' });

  // Light per-folder quota: 300 files
  const { data: existing } = await admin.storage.from('media').list(folder, { limit: 301 });
  if ((existing?.length ?? 0) >= 300) return reply(429, { error: 'Trop d’images enregistrées pour cet établissement.' });

  const path = `${folder}/${kind}-${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await admin.storage.from('media').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return reply(500, { error: 'L’image n’a pas pu être enregistrée.' });

  const { data: pub } = admin.storage.from('media').getPublicUrl(path);
  return reply(200, { url: pub.publicUrl });
});
