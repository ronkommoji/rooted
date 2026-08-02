/**
 * Image optimization utilities for caching and performance
 */

import { Image } from 'expo-image';

type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
};

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
 * Adds image transformation parameters to Supabase storage URLs.
 * This keeps external image URLs unchanged because they do not support Supabase transforms.
 */
export const optimizeImageUrl = (
  url: string | null,
  options?: ImageTransformOptions
): string | null => {
  if (!url) return null;
  
  try {
    if (!url.includes('supabase')) {
      return url;
    }

    const urlObj = new URL(url);
    
    if (options?.width) {
      urlObj.searchParams.set('width', options.width.toString());
    }
    if (options?.height) {
      urlObj.searchParams.set('height', options.height.toString());
    }
    if (options?.quality) {
      urlObj.searchParams.set('quality', options.quality.toString());
    }
    if (options?.width || options?.height) {
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
    image_url: optimizeImageUrl(d.image_url, { width: 400, height: 400, quality: 80 }),
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
