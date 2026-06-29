import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (
  supabaseUrl === 'https://placeholder-project.supabase.co' || 
  supabaseAnonKey === 'placeholder-key'
) {
  console.warn(
    '⚠️ Supabase environment variables are missing! Please fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file to enable database and online multiplayer functions.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
