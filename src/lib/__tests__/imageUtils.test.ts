jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

import { optimizeDevotionalImages, optimizeImageUrl } from '../imageUtils';

const supabaseUrl =
  'https://project.supabase.co/storage/v1/object/public/devotionals/image.jpg?token=abc';

describe('optimizeImageUrl', () => {
  it('adds requested Supabase transformation parameters', () => {
    const result = optimizeImageUrl(supabaseUrl, {
      width: 400,
      height: 300,
      quality: 80,
    });

    const transformedUrl = new URL(result!);

    expect(transformedUrl.searchParams.get('token')).toBe('abc');
    expect(transformedUrl.searchParams.get('width')).toBe('400');
    expect(transformedUrl.searchParams.get('height')).toBe('300');
    expect(transformedUrl.searchParams.get('quality')).toBe('80');
    expect(transformedUrl.searchParams.get('resize')).toBe('cover');
  });

  it('does not add Supabase-only parameters to external image URLs', () => {
    const externalUrl = 'https://images.example.com/image.jpg?token=abc';

    expect(optimizeImageUrl(externalUrl, { width: 400, quality: 80 })).toBe(externalUrl);
  });

  it('creates square, quality-optimized grid image URLs', () => {
    const [devotional] = optimizeDevotionalImages([
      { id: 'devotional-1', image_url: supabaseUrl },
    ]);

    const transformedUrl = new URL(devotional.image_url!);

    expect(transformedUrl.searchParams.get('width')).toBe('400');
    expect(transformedUrl.searchParams.get('height')).toBe('400');
    expect(transformedUrl.searchParams.get('quality')).toBe('80');
    expect(transformedUrl.searchParams.get('resize')).toBe('cover');
  });
});
