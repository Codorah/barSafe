import { createClient } from '@supabase/supabase-js';

// Public project credentials (protected by RLS). Overridable via Vite env.
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://uzpetqjkmymqdggitsih.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cGV0cWprbXltcWRnZ2l0c2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzg0NTYsImV4cCI6MjA5OTU1NDQ1Nn0.heBwd_AP44WAcp2KZApM_rNyiJd3wNJ_ArciFxdE7Gw';

export const supabase = createClient(supabaseUrl, supabaseKey);
