import AsyncStorage from '@react-native-async-storage/async-storage';

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number; // Maximum attempts allowed
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after max attempts
  minDelayMs: number; // Minimum delay between attempts
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  minDelayMs: 1000, // 1 second minimum between attempts
};

const STORAGE_KEY_PREFIX = '@rate_limit_';

/**
 * Get storage key for a specific identifier (email)
 */
const getStorageKey = (identifier: string): string => {
  return `${STORAGE_KEY_PREFIX}${identifier.toLowerCase()}`;
};

/**
 * Get rate limit entry from storage
 */
const getRateLimitEntry = async (identifier: string): Promise<RateLimitEntry | null> => {
  try {
    const key = getStorageKey(identifier);
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as RateLimitEntry;
  } catch {
    return null;
  }
};

/**
 * Save rate limit entry to storage
 */
const saveRateLimitEntry = async (identifier: string, entry: RateLimitEntry): Promise<void> => {
  try {
    const key = getStorageKey(identifier);
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear rate limit entry (used after successful auth)
 */
export const clearRateLimit = async (identifier: string): Promise<void> => {
  try {
    const key = getStorageKey(identifier);
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Check if an action is rate limited
 * @param identifier - Unique identifier (typically email)
 * @param config - Rate limit configuration (optional, uses defaults)
 * @returns Object with `allowed` boolean and `message` string
 */
export const checkRateLimit = async (
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; message: string; retryAfter?: number }> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  
  // Get existing entry
  const entry = await getRateLimitEntry(identifier);
  
  if (!entry) {
    // First attempt - allow it
    await saveRateLimitEntry(identifier, {
      attempts: 1,
      lastAttempt: now,
    });
    return { allowed: true, message: '' };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000); // seconds
    const minutes = Math.ceil(retryAfter / 60);
    return {
      allowed: false,
      message: `Too many attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      retryAfter,
    };
  }

  // Check if window has expired - reset
  if (now - entry.lastAttempt > finalConfig.windowMs) {
    await saveRateLimitEntry(identifier, {
      attempts: 1,
      lastAttempt: now,
    });
    return { allowed: true, message: '' };
  }

  // Check minimum delay between attempts
  const timeSinceLastAttempt = now - entry.lastAttempt;
  if (timeSinceLastAttempt < finalConfig.minDelayMs) {
    const waitMs = finalConfig.minDelayMs - timeSinceLastAttempt;
    return {
      allowed: false,
      message: `Please wait ${Math.ceil(waitMs / 1000)} second${Math.ceil(waitMs / 1000) !== 1 ? 's' : ''} before trying again.`,
      retryAfter: Math.ceil(waitMs / 1000),
    };
  }

  // Check if max attempts reached
  if (entry.attempts >= finalConfig.maxAttempts) {
    const blockedUntil = now + finalConfig.blockDurationMs;
    await saveRateLimitEntry(identifier, {
      attempts: entry.attempts + 1,
      lastAttempt: now,
      blockedUntil,
    });
    const minutes = Math.ceil(finalConfig.blockDurationMs / 60000);
    return {
      allowed: false,
      message: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      retryAfter: Math.ceil(finalConfig.blockDurationMs / 1000),
    };
  }

  // Increment attempts
  await saveRateLimitEntry(identifier, {
    attempts: entry.attempts + 1,
    lastAttempt: now,
    blockedUntil: entry.blockedUntil,
  });

  const remainingAttempts = finalConfig.maxAttempts - entry.attempts - 1;
  if (remainingAttempts <= 2 && remainingAttempts > 0) {
    return {
      allowed: true,
      message: `Warning: ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
    };
  }

  return { allowed: true, message: '' };
};

/**
 * Record a failed attempt (increment counter)
 */
export const recordFailedAttempt = async (
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<void> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  
  const entry = await getRateLimitEntry(identifier);
  
  if (!entry) {
    await saveRateLimitEntry(identifier, {
      attempts: 1,
      lastAttempt: now,
    });
    return;
  }

  // If window expired, reset
  if (now - entry.lastAttempt > finalConfig.windowMs) {
    await saveRateLimitEntry(identifier, {
      attempts: 1,
      lastAttempt: now,
    });
    return;
  }

  // Increment attempts
  const newAttempts = entry.attempts + 1;
  let blockedUntil = entry.blockedUntil;

  // Block if max attempts reached
  if (newAttempts >= finalConfig.maxAttempts) {
    blockedUntil = now + finalConfig.blockDurationMs;
  }

  await saveRateLimitEntry(identifier, {
    attempts: newAttempts,
    lastAttempt: now,
    blockedUntil,
  });
};

