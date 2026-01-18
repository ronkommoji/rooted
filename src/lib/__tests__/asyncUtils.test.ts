import {
  withTimeout,
  withRetry,
  allSettledWithTimeout,
  debounce,
} from '../asyncUtils';

// Helper to create a delayed promise
const delay = (ms: number, value?: any) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const delayReject = (ms: number, error: Error) =>
  new Promise((_, reject) => setTimeout(() => reject(error), ms));

describe('asyncUtils', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('withTimeout', () => {
    it('should resolve successfully when promise completes within timeout', async () => {
      const promise = delay(100, 'success');
      const result = await withTimeout(promise, 200);
      expect(result).toBe('success');
    });

    it('should reject with timeout error when promise exceeds timeout', async () => {
      const promise = delay(300, 'should not resolve');
      await expect(withTimeout(promise, 100)).rejects.toThrow('Operation timed out');
    });

    it('should use custom error message for timeout', async () => {
      const promise = delay(300, 'should not resolve');
      await expect(
        withTimeout(promise, 100, 'Custom timeout message')
      ).rejects.toThrow('Custom timeout message');
    });

    it('should use default timeout of 15000ms when not specified', async () => {
      const promise = delay(100, 'success');
      const result = await withTimeout(promise);
      expect(result).toBe('success');
    });

    it('should propagate errors from the original promise', async () => {
      const error = new Error('Original error');
      const promise = delayReject(100, error);
      await expect(withTimeout(promise, 200)).rejects.toThrow('Original error');
    });

    it('should handle promises that resolve immediately', async () => {
      const promise = Promise.resolve('immediate');
      const result = await withTimeout(promise, 100);
      expect(result).toBe('immediate');
    });

    it('should handle promises that reject immediately', async () => {
      const promise = Promise.reject(new Error('Immediate error'));
      await expect(withTimeout(promise, 100)).rejects.toThrow('Immediate error');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3, 100);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations up to maxRetries', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after exhausting all retries', async () => {
      const error = new Error('Persistent error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn, 2, 10)).rejects.toThrow('Persistent error');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff between retries', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      await withRetry(fn, 2, 100); // 100ms initial delay
      const duration = Date.now() - startTime;

      // First retry: 100ms, second retry: 200ms = total ~300ms
      // Allow some tolerance for execution time
      expect(duration).toBeGreaterThan(250);
      expect(duration).toBeLessThan(500);
    });

    it('should apply timeout to each attempt', async () => {
      const fn = jest.fn(() => delay(200, 'too slow'));

      await expect(withRetry(fn, 2, 10, 100)).rejects.toThrow(/timed out/i);
    });

    it('should handle non-Error objects as errors', async () => {
      const fn = jest.fn().mockRejectedValue('string error');

      await expect(withRetry(fn, 0, 10)).rejects.toThrow('string error');
    });
  });

  describe('allSettledWithTimeout', () => {
    it('should resolve all successful promises', async () => {
      const promises = [
        Promise.resolve('result1'),
        Promise.resolve('result2'),
        Promise.resolve('result3'),
      ];

      const results = await allSettledWithTimeout(promises);

      expect(results).toEqual([
        { success: true, data: 'result1' },
        { success: true, data: 'result2' },
        { success: true, data: 'result3' },
      ]);
    });

    it('should handle mixed success and failure', async () => {
      const error = new Error('Failed promise');
      const promises = [
        Promise.resolve('success'),
        Promise.reject(error),
        Promise.resolve('another success'),
      ];

      const results = await allSettledWithTimeout(promises);

      expect(results[0]).toEqual({ success: true, data: 'success' });
      expect(results[1]).toEqual({ success: false, error });
      expect(results[2]).toEqual({ success: true, data: 'another success' });
    });

    it('should apply timeout to each promise', async () => {
      const promises = [
        delay(50, 'fast'),
        delay(200, 'slow'), // Will timeout
        delay(50, 'fast2'),
      ];

      const results = await allSettledWithTimeout(promises, 100);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toMatch(/timed out/i);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await allSettledWithTimeout([]);
      expect(results).toEqual([]);
    });

    it('should convert non-Error rejections to Error objects', async () => {
      const promises = [Promise.reject('string error')];

      const results = await allSettledWithTimeout(promises);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeInstanceOf(Error);
      expect(results[0].error?.message).toBe('string error');
    });

    it('should wait for all promises even if some fail', async () => {
      const promises = [
        delay(100, 'result1'),
        Promise.reject(new Error('error1')),
        delay(150, 'result2'),
        Promise.reject(new Error('error2')),
      ];

      const results = await allSettledWithTimeout(promises, 200);

      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(false);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('test');
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('test');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls when called multiple times', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('call1');
      jest.advanceTimersByTime(50);

      debouncedFn('call2');
      jest.advanceTimersByTime(50);

      debouncedFn('call3');
      jest.advanceTimersByTime(100);

      // Only the last call should execute
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('call3');
    });

    it('should handle multiple separate invocations', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('first');

      debouncedFn('second');
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('second');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass all arguments correctly', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2', 'arg3');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should work with different delay times', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 500);

      debouncedFn('test');
      jest.advanceTimersByTime(400);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('test');
    });

    it('should handle rapid successive calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      // Call 10 times rapidly
      for (let i = 0; i < 10; i++) {
        debouncedFn(i);
        jest.advanceTimersByTime(10);
      }

      // Only last call should execute after full delay
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(9);
    });
  });
});
