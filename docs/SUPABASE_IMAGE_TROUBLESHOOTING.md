# Supabase Image Loading Troubleshooting

Images are still loading slowly even after code optimizations. This indicates a **server/network** issue, not a code issue.

## 🔍 Things to Check in Supabase Dashboard

### 1. Storage Bucket Configuration

Go to: **Supabase Dashboard → Storage → devotionals bucket**

#### Check: Bucket is PUBLIC
- **Issue**: If bucket is private, every image requires authentication token
- **Impact**: Adds ~500ms+ per image for token validation
- **Fix**: 
  1. Click on `devotionals` bucket
  2. Click "Make Public" if it's currently private
  3. OR use signed URLs with longer expiration

#### Check: File Access Policies (RLS)
- Navigate to: **Storage → Policies**
- Look for policies on `objects` in the `devotionals` bucket
- **Current setup should be**: 
  ```sql
  -- Allow public SELECT (read) access
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotionals');
  ```
- If policies are too restrictive, images will be slow/blocked

### 2. CDN Configuration

Go to: **Project Settings → Storage → CDN**

#### Check: CDN is Enabled
- **Issue**: Without CDN, all images load from single origin server
- **Impact**: Slow downloads, no geographic optimization
- **Fix**: Enable Supabase CDN (should be on by default for new projects)

#### Check: CDN Cache Headers
- Images should have `Cache-Control` headers like:
  ```
  Cache-Control: public, max-age=31536000, immutable
  ```
- This tells CDN/browsers to cache aggressively

### 3. Check Image URLs

Copy one of your slow-loading image URLs and check:

#### URL Format Should Be:
```
https://[project-ref].supabase.co/storage/v1/object/public/devotionals/[path]
```

**If you see**: `...object/sign/...` → Images are using signed URLs (slower)
**Should be**: `...object/public/...` → Direct public access (faster)

#### Test Image Load Time
1. Open browser DevTools (Network tab)
2. Paste image URL in browser
3. Check load time:
   - **Good**: <500ms
   - **Slow**: 1-3 seconds
   - **Very slow**: 5+ seconds

If images are slow in browser too, it's definitely a Supabase issue, not app code.

### 4. Check Storage Location/Region

Go to: **Project Settings → General → Region**

#### Check: Project Region
- **Issue**: If your users are far from the Supabase region, images will be slow
- **Example**: Project in `us-east-1`, users in Asia = slow
- **Fix**: 
  - For existing project: Enable Supabase CDN
  - For new project: Choose region closest to users
  - Long-term: Use external CDN (Cloudflare, CloudFront)

### 5. Check Image File Sizes

Go to: **Storage → devotionals → Browse files**

#### Check: Individual Image Sizes
- **Ideal**: 200-500 KB per image
- **Acceptable**: 500KB - 1MB
- **Too large**: 2MB+
- **Way too large**: 5MB+

If images are 5MB+:
- Users are uploading full-resolution photos
- Each image takes 5-10+ seconds on mobile
- **Fix**: Add image compression on upload (see code fix below)

### 6. Check Concurrent Connection Limits

#### Symptom: First few images load, then others hang
- **Issue**: Supabase limits concurrent connections per IP
- **Default**: Usually 6 concurrent requests
- **Problem**: Profile with 50 images tries to load all at once

**Already fixed in code** with the grid approach, but if still seeing this:
- Images should load in batches as user scrolls
- Only ~12 images should load initially

### 7. Network Tab Analysis (React Native Debugger)

Enable network inspection to see actual timings:

```bash
# In terminal where you ran npm start
# Press 'j' to open debugger
```

Then check:
1. How many images load simultaneously?
2. What's the actual download time per image?
3. Are requests timing out?
4. Any 403/401 errors (authentication issues)?

---

## 🔧 Quick Fixes to Try Right Now

### Fix 1: Make Bucket Public (if it's private)

```sql
-- Run this in Supabase SQL Editor
-- Settings → Database → SQL Editor → New Query

-- Make devotionals bucket public for reads
INSERT INTO storage.buckets (id, name, public)
VALUES ('devotionals', 'devotionals', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Add public read policy
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'devotionals');
```

### Fix 2: Add Proper Cache Headers

Go to: **Storage → devotionals → Configuration**

Add:
```json
{
  "cacheControl": "public, max-age=31536000, immutable"
}
```

### Fix 3: Enable CDN (if disabled)

Contact Supabase support or check:
**Project Settings → Storage → Enable CDN**

---

## 🚀 Code Fix: Compress Images on Upload

If images are too large, add compression to upload:

```typescript
// src/lib/imageCompression.ts
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const compressImage = async (uri: string): Promise<string> => {
  const maxWidth = 1200;
  const maxHeight = 1200;
  const quality = 0.8; // 80% quality
  
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: quality, format: SaveFormat.JPEG }
  );
  
  return result.uri;
};
```

Then in upload function:

```typescript
// Before uploading
const compressedUri = await compressImage(imageUri);
// Then upload compressedUri instead of imageUri
```

---

## 📊 Expected Performance After Fixes

| Setup | Load Time per Image | Load Time for 12 Images |
|-------|---------------------|-------------------------|
| **Private bucket, no CDN** | 2-5s | 20-50s (terrible) |
| **Public bucket, no CDN** | 1-2s | 10-15s (bad) |
| **Public bucket, with CDN** | 200-800ms | 2-5s (good) |
| **Public + CDN + compression** | 100-400ms | 1-3s (excellent) |

---

## 🔍 Diagnostic Queries

Run these in **Supabase SQL Editor** to check your setup:

### Check if bucket is public:
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'devotionals';
```

Should return: `public = true`

### Check storage policies:
```sql
SELECT * 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

Should see policies allowing SELECT on devotionals bucket.

### Check image sizes:
```sql
SELECT 
  name,
  pg_size_pretty(CAST(metadata->>'size' AS bigint)) as size,
  created_at
FROM storage.objects
WHERE bucket_id = 'devotionals'
ORDER BY (metadata->>'size')::bigint DESC
LIMIT 20;
```

This shows your 20 largest images.

---

## 🆘 If Nothing Works

1. **Check Supabase Status**: https://status.supabase.com
2. **Check your internet speed**: Fast.com
3. **Contact Supabase Support**: dashboard → Support → New ticket
4. **Consider external CDN**: Cloudflare, CloudFront, or Bunny CDN

---

## 📱 Quick Test

Run this in your terminal to test image load speed directly:

```bash
# Replace with one of your actual image URLs
curl -o /dev/null -s -w "Time: %{time_total}s\n" \
  "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/devotionals/YOUR_IMAGE.jpg"
```

- **Under 1 second**: Good, issue is in app code (unlikely after our fixes)
- **1-3 seconds**: Supabase/CDN issue, follow fixes above
- **Over 3 seconds**: Major server/network issue, contact Supabase support

---

## Priority Checklist

Do these in order:

- [ ] 1. Check bucket is PUBLIC in dashboard
- [ ] 2. Verify image URLs use `/public/` not `/sign/`
- [ ] 3. Enable CDN in project settings
- [ ] 4. Check image file sizes (should be <1MB)
- [ ] 5. Test one image URL in browser DevTools
- [ ] 6. Run SQL queries above to verify policies
- [ ] 7. Add image compression on upload (code above)
- [ ] 8. Contact Supabase support if still slow

Most common issue: **Private bucket or no CDN enabled**. Check these first!
