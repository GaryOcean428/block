import { supabase } from './supabase';
import type { Provider } from '@supabase/supabase-js';

export type SignInCredentials = {
  email: string;
  password: string;
};

export const signInWithEmail = async ({ email, password }: SignInCredentials) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error);
    return { error: error.message };
  }

  return { user: data.user, session: data.session };
};

export const signUpWithEmail = async ({ email, password }: SignInCredentials) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error signing up:', error);
    return { error: error.message };
  }

  return { user: data.user, session: data.session };
};

export const signInWithProvider = async (provider: Provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing in with provider:', error);
    return { error: error.message };
  }

  return { data };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  }

  return { success: true };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return { error: error.message };
  }

  return { user: data.user };
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting current session:', error);
    return { error: error.message };
  }

  return { session: data.session };
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('Error resetting password:', error);
    return { error: error.message };
  }

  return { success: true };
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error);
    return { error: error.message };
  }

  return { success: true };
};
