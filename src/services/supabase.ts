import { createBrowserClient } from '../utils/supabase-browser';

// Create Supabase client using the browser utility
export const supabase = createBrowserClient();

// User API Keys management - with proper RLS this will be secure
export const getUserApiKeys = async (userId: string) => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user API keys:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching user API keys:', error);
    return null;
  }
};

export const saveUserApiKeys = async (userId: string, apiKey: string, apiSecret: string) => {
  if (!userId) return { error: 'User not authenticated' };

  try {
    // We're only storing encrypted values in the database
    // The encryption happens server-side via Supabase RLS and Postgres functions
    const { data, error } = await supabase.rpc('save_api_keys', {
      p_api_key: apiKey,
      p_api_secret: apiSecret,
    });

    if (error) {
      console.error('Error saving user API keys:', error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Exception saving user API keys:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
};

export const deleteUserApiKeys = async (userId: string) => {
  if (!userId) return { error: 'User not authenticated' };

  try {
    const { error } = await supabase.from('user_api_keys').delete().eq('user_id', userId);

    if (error) {
      console.error('Error deleting user API keys:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception deleting user API keys:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
};
