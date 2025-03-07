/**
 * React Query Provider configuration
 * Sets up global query client for efficient API data fetching and caching
 */
import { ReactNode } from 'react';
import { 
  QueryClient, 
  QueryClientProvider, 
  DefaultOptions 
} from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

// Default options for all queries
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions,
});

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export the client for direct usage
export { queryClient };
