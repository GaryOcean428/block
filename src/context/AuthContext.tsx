import { createContext } from 'react';
import { type AuthUser as User, type Session } from '@supabase/supabase-js';

/**
 * Interface for the Authentication context
 */
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  devUser: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * React context for authentication state
 * Used by the useAuth hook
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
