# 🚨 EMERGENCY: 5+ Second Image Load Times

Images taking 5+ seconds in browser = **Server-side issue**, not app code.

## Immediate Actions (Do Right Now)

### 1. Check Bucket Privacy Status

Go to Supabase Dashboard and run this SQL query:

```sql
-- Check if devotionals bucket is public
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'devotionals';
```

**If `public = false`**: This is your problem! Run this:

```sql
-- Make bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'devotionals';
```

### 2. Check Storage Policies

```sql
-- Check current policies on storage.objects
SELECT * 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

**If you see restrictive policies or no SELECT policy**, run this:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can only read own files" ON storage.objects;

-- Add public read access
CREATE POLICY "Public read access for devotionals"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'devotionals');

-- Keep write access for authenticated users only
CREATE POLICY "Authenticated users can upload to devotionals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'devotionals');
```

### 3. Check Image File Sizes

```sql
-- Find your largest images
SELECT 
  name,
  CAST(metadata->>'size' AS bigint) as size_bytes,
  pg_size_pretty(CAST(metadata->>'size' AS bigint)) as size_readable,
  created_at
FROM storage.objects
WHERE bucket_id = 'devotionals'
ORDER BY (metadata->>'size')::bigint DESC
LIMIT 20;
```

**If you see images over 2MB**: That's a big problem. Users are uploading huge files.

### 4. Check Project Region vs User Location

Go to: **Project Settings → General → Infrastructure**

- Check your project region (e.g., `us-east-1`, `eu-west-1`, etc.)
- Where are most of your users located?
- If there's a big mismatch (project in US, users in Asia), that's causing the slowness

---

## ⚡ FASTEST FIX: Add Image Compression NOW

Since this is causing churn, add image compression immediately:

### Install expo-image-manipulator

```bash
npx expo install expo-image-manipulator
```

### Update the upload function

Find where images are uploaded (likely in `useDevotionals.ts` or `uploadDevotionalImage`):

```typescript
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Add this compression function
const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Resize to max 1200px width
      { 
        compress: 0.7, // 70% quality (good balance)
        format: SaveFormat.JPEG 
      }
    );
    return result.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    return uri; // Fallback to original
  }
};

// In your upload function, BEFORE uploading to Supabase:
export const uploadDevotionalImage = async (imageUri: string, userId: string): Promise<string | null> => {
  try {
    // ✅ ADD THIS LINE
    const compressedUri = await compressImage(imageUri);
    
    // Validate image
    const validation = await validateImage(compressedUri, { // Use compressed version
      maxSize: 5 * 1024 * 1024,
      maxWidth: 4000,
      maxHeight: 4000,
    });
    
    // ... rest of upload code using compressedUri instead of imageUri
```

This will **reduce image sizes by 70-90%** immediately.

---

## 🔥 Alternative: Use Cloudflare R2 (If Supabase Can't Be Fixed)

If Supabase continues to be slow, you can switch to Cloudflare R2:

**Benefits:**
- Much faster globally
- Cheaper ($0.015/GB vs Supabase's pricing)
- Free egress bandwidth
- Built-in CDN

**Setup time:** ~30 minutes

Would you like instructions for migrating to R2 if Supabase can't be fixed?

---

## 📊 What to Expect After Fixes

| Issue | Current Load Time | After Fix |
|-------|------------------|-----------|
| Private bucket | 5-10+ seconds | 200-800ms |
| No compression | 3-5 seconds | 500ms-1.5s |
| Wrong region | 5+ seconds | 1-2s (if possible, migrate) |
| No CDN | 2-5 seconds | 500ms-1s |

---

## ✅ Priority Order (Do in This Exact Order)

1. **[5 min]** Make bucket public (SQL above)
2. **[5 min]** Add public read policy (SQL above)
3. **[15 min]** Add image compression to uploads (code above)
4. **[2 min]** Check project region matches user location
5. **[Ask support]** Enable CDN if not already enabled
6. **[Last resort]** Consider Cloudflare R2 migration

---

## 🆘 Emergency Contact Supabase

If SQL fixes don't work, open urgent support ticket:

**Subject:** "URGENT: Storage extremely slow (5+ second load times) - Users churning"

**Body:**
```
Project: [YOUR_PROJECT_REF]
Issue: Image loads taking 5+ seconds even in browser
Bucket: devotionals
Impact: HIGH - Users churning due to slow performance
Tested: Image URL loads in 5+ seconds in browser
Request: Please investigate storage performance and CDN status
```

---

## 🧪 Test After Each Fix

After each change, test with:

```bash
time curl -o /dev/null "YOUR_IMAGE_URL"
```

Target: Under 1 second

---

## What's Your Image URL Format?

Please share (you can redact the project ID):

1. Is it `/object/public/` or `/object/sign/`?
2. Is it going through a CDN domain or directly to Supabase?
3. What's the file extension (.jpg, .png, .heic)?

This will help me give you the exact fix needed.
