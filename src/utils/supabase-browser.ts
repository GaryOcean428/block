import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const createBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Check your environment variables.');
  }

  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      persistSession: true,
      storageKey: 'supabase-block-app-auth',
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'block-trading-platform',
      },
    },
  });
};
