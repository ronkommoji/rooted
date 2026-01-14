/**
 * Utility functions for handling async operations with timeouts and retries
 */

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds (default: 15000)
 * @param errorMessage Custom error message
 * @returns The promise result or throws timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Retries an async operation with exponential backoff
 * @param fn The async function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param initialDelayMs Initial delay in milliseconds (default: 1000)
 * @param timeoutMs Timeout per attempt in milliseconds (default: 15000)
 * @returns The result of the operation
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  timeoutMs: number = 15000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, `Operation timed out after ${timeoutMs}ms`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelayMs * Math.pow(2, attempt);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Executes multiple promises and returns results even if some fail
 * Uses Promise.allSettled to ensure all operations complete
 * @param promises Array of promises to execute
 * @param timeoutMs Timeout for each promise (default: 15000)
 * @returns Array of results with success/error status
 */
export async function allSettledWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number = 15000
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const timeoutPromises = promises.map(promise =>
    withTimeout(promise, timeoutMs).then(
      data => ({ success: true, data }),
      error => ({ success: false, error: error instanceof Error ? error : new Error(String(error)) })
    )
  );
  
  return Promise.all(timeoutPromises);
}

/**
 * Creates a debounced version of a function
 * @param fn The function to debounce
 * @param delayMs Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
