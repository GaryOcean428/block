/**
 * Modern fetch client with TypeScript support, retry logic, and error handling
 * Replaces axios with a more lightweight and future-proof solution
 */
import { API } from '@config/constants';
import { ApiError, NetworkError, TimeoutError } from './errors';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Creates a URL with query parameters
 */
function createUrl(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url;
}

/**
 * Creates a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = API.TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError();
    }

    if (!navigator.onLine) {
      throw new NetworkError('No internet connection');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Implements exponential backoff for retries
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  retryDelay = 300,
  timeout = API.TIMEOUT_MS
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeout);
    } catch (error) {
      lastError = error;

      // Don't retry if it's a user abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // Don't retry if we're out of attempts
      if (attempt >= retries) {
        throw error;
      }

      // Calculate exponential backoff delay with jitter
      const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 100;

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never happen but TypeScript needs it
  throw lastError;
}

/**
 * Processes API response and handles errors
 */
async function processResponse<T>(response: Response): Promise<T> {
  // Get response content type
  const contentType = response.headers.get('content-type') || '';

  // Process JSON responses
  if (contentType.includes('application/json')) {
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || data.error || `API Error: ${response.status}`,
        data
      );
    }

    return data as T;
  }

  // Process text responses
  if (contentType.includes('text/')) {
    const text = await response.text();

    if (!response.ok) {
      throw new ApiError(response.status, text || `API Error: ${response.status}`);
    }

    return text as unknown as T;
  }

  // Process other response types
  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.status}`);
  }

  // If we don't know how to handle the content type, return as blob
  const blob = await response.blob();
  return blob as unknown as T;
}

/**
 * Main fetch client for API requests
 */
export async function fetchClient<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const {
    body,
    params,
    headers = {},
    timeout = API.TIMEOUT_MS,
    retries = 2,
    retryDelay = 300,
    ...rest
  } = options;

  const requestHeaders = new Headers(headers);

  // Add JSON Content-Type header for JSON payloads
  if (body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    ...rest,
    headers: requestHeaders,
  };

  // Handle request body
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  // Create URL with params
  const requestUrl = createUrl(url, params);

  // Perform request with retries
  try {
    const response = await fetchWithRetry(requestUrl, fetchOptions, retries, retryDelay, timeout);

    return processResponse<T>(response);
  } catch (error) {
    // Convert fetch errors to our custom error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network request failed');
    }

    throw error;
  }
}

/**
 * HTTP method-specific helper functions
 */
export const http = {
  get: <T>(url: string, options?: FetchOptions): Promise<T> =>
    fetchClient<T>(url, { method: 'GET', ...options }),

  post: <T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> =>
    fetchClient<T>(url, { method: 'POST', body, ...options }),

  put: <T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> =>
    fetchClient<T>(url, { method: 'PUT', body, ...options }),

  patch: <T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> =>
    fetchClient<T>(url, { method: 'PATCH', body, ...options }),

  delete: <T>(url: string, options?: FetchOptions): Promise<T> =>
    fetchClient<T>(url, { method: 'DELETE', ...options }),
};
