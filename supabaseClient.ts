import { createClient } from '@supabase/supabase-js';
import { Database } from './types_supabase'; // On créera ce fichier plus tard si besoin de typage fort ou on utilisera ANY

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxxxxxxx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJh...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
