import React, { useEffect, useState, useMemo } from 'react';
import { type AuthUser as User, type Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthContext } from './AuthContext';

/**
 * Provider component for Authentication context
 * Manages user session state and authentication flow
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
          // Continue with a null session instead of throwing
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        console.error('Exception getting session:', error);
        setError(error instanceof Error ? error.message : 'Unknown authentication error');
        // Continue with a null session
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Initialize auth and handle any errors gracefully
    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, newSession) => {
      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Clear any previous errors when auth state changes successfully
        if (error) setError(null);
      } catch (authError) {
        console.error('Auth state change error:', authError);
        // Don't throw, just log and continue with current state
      }
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [error]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      // Add a method to check if a user is authenticated that won't throw
      isAuthenticated: !!user && !!session,
      // Add a mock user for development if needed
      devUser: {
        id: 'dev-user-id',
        email: 'dev@example.com',
        name: 'Development User',
      },
    }),
    [user, session, loading, error]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
