/**
 * React Query Provider configuration
 * Sets up global query client for efficient API data fetching and caching
 */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  readonly children: ReactNode;
}

/**
 * Provides React Query context to the application
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a client with our default options inline to avoid Fast Refresh limitations
  // This ensures that the client is properly managed by React's lifecycle
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
      },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
