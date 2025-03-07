/**
 * Custom React Query hook for data fetching
 * Combines React Query with our fetch client for a unified API
 */
import { 
  useQuery as useReactQuery, 
  useMutation as useReactMutation,
  useQueryClient,
  QueryKey, 
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { http, FetchOptions } from '@core/utils/fetchClient';
import { getErrorMessage } from '@core/utils/errors';

/**
 * Enhanced useQuery hook with automatic error handling
 */
export function useQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  url: string,
  options?: FetchOptions & {
    queryOptions?: UseQueryOptions<TData, TError>;
  }
) {
  const { queryOptions, ...fetchOptions } = options || {};
  
  return useReactQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        return await http.get<TData>(url, fetchOptions);
      } catch (error) {
        console.error(`Query error for ${url}:`, error);
        throw error;
      }
    },
    ...queryOptions,
  });
}

/**
 * Mutation hook for data modifications (POST, PUT, DELETE)
 */
export function useMutation<TData = unknown, TVariables = unknown, TError = unknown>(
  url: string,
  method: 'post' | 'put' | 'patch' | 'delete',
  options?: {
    mutationOptions?: UseMutationOptions<TData, TError, TVariables>;
    fetchOptions?: Omit<FetchOptions, 'body'>;
    invalidateQueries?: QueryKey[];
  }
) {
  const queryClient = useQueryClient();
  const { mutationOptions, fetchOptions, invalidateQueries } = options || {};
  
  return useReactMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      try {
        if (method === 'delete') {
          return await http.delete<TData>(url, {
            ...fetchOptions,
            params: variables as any,
          });
        }
        
        return await http[method]<TData>(url, variables, fetchOptions);
      } catch (error) {
        console.error(`Mutation error for ${method.toUpperCase()} ${url}:`, error);
        throw error;
      }
    },
    onSuccess: async (data, variables, context) => {
      // Invalidate affected queries when successful
      if (invalidateQueries?.length) {
        await Promise.all(
          invalidateQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }
      
      // Call user-provided onSuccess
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
}

/**
 * Hook for infinite scrolling queries
 */
export function useInfiniteQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  getUrl: (pageParam: number) => string,
  options?: FetchOptions & {
    queryOptions?: UseQueryOptions<TData, TError>;
    initialPageParam?: number;
  }
) {
  const { queryOptions, initialPageParam = 0, ...fetchOptions } = options || {};
  
  return useReactQuery<TData, TError>({
    queryKey,
    queryFn: async ({ pageParam = initialPageParam }) => {
      const url = getUrl(pageParam as number);
      return http.get<TData>(url, fetchOptions);
    },
    ...queryOptions,
  });
}

/**
 * Simple hook for common error handling
 */
export function useQueryErrorHandler() {
  return {
    handleError: (error: unknown) => {
      const errorMessage = getErrorMessage(error);
      // You could integrate this with a toast notification system
      console.error('Query error:', errorMessage);
      return errorMessage;
    }
  };
}
