/**
 * Image optimization utilities for caching and performance
 */

import { Image } from 'react-native';

/**
 * Generates a thumbnail URL from Supabase storage URL
 * Supabase uses imgproxy for image transformations
 * Format: {base_url}/render/image/authenticated/{bucket}/{path}?width=X&height=Y
 */
export const getImageThumbnail = (url: string | null, size: number = 400): string | null => {
  if (!url) return null;
  
  try {
    // For Supabase storage URLs, add transform parameters
    // This creates a smaller version on-the-fly
    if (url.includes('supabase')) {
      const urlObj = new URL(url);
      // Add transform query params that Supabase storage supports
      urlObj.searchParams.set('width', size.toString());
      urlObj.searchParams.set('height', size.toString());
      urlObj.searchParams.set('resize', 'cover');
      return urlObj.toString();
    }
    
    return url;
  } catch (error) {
    return url;
  }
};

/**
 * Adds cache-control parameters to image URLs
 * This helps expo-image cache images more efficiently
 */
export const optimizeImageUrl = (url: string | null, options?: {
  width?: number;
  quality?: number;
}): string | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // For Supabase URLs, add transformation parameters
    if (options?.width) {
      urlObj.searchParams.set('width', options.width.toString());
      if (options.width === options?.quality) {
        urlObj.searchParams.set('height', options.width.toString());
      }
      urlObj.searchParams.set('resize', 'cover');
    }
    
    return urlObj.toString();
  } catch (error) {
    return url;
  }
};

/**
 * Optimizes an array of devotional images for grid display
 */
export const optimizeDevotionalImages = (devotionals: Array<{ image_url: string | null; id: string }>) => {
  return devotionals.map(d => ({
    ...d,
    image_url: optimizeImageUrl(d.image_url, { width: 400, quality: 80 }),
  }));
};

/**
 * Preloads images for faster rendering
 * Returns a promise that resolves when all images are cached
 */
export const preloadImages = async (imageUrls: string[]): Promise<void> => {
  const validUrls = imageUrls.filter(url => url && url.trim() !== '');
  
  if (validUrls.length === 0) return;
  
  try {
    await Promise.all(
      validUrls.map(url => 
        Image.prefetch(url).catch(err => {
          console.warn('Failed to prefetch image:', url, err);
          return false;
        })
      )
    );
  } catch (error) {
    console.warn('Error preloading images:', error);
  }
};
