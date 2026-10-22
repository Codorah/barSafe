import { createClient } from '@supabase/supabase-js';

// Credentials come from `.env.local` (see `.env.example`). The anon key is public by
// design: every write goes through SECURITY DEFINER RPCs that check a staff session.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (copiez .env.example vers .env.local).');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
