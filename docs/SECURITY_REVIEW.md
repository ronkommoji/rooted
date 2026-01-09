# Vibecoder Security Review: Rooted

**Date:** 2024-12-19

## Summary

Found **2 critical issues**, **3 high-priority issues**, and **2 medium-priority issues** in this React Native/Expo application using Supabase backend.

**Stack:** React Native with Expo, TypeScript, Supabase (PostgreSQL, Auth, Realtime), Zustand  
**Environment:** Mobile app (iOS/Android) with Supabase backend  
**Auth pattern:** Supabase Auth with JWT sessions

---

## Findings

### [CRITICAL] Hardcoded Supabase Credentials in Source Code

**Location:** `src/lib/supabase.ts:42-43`

**Issue:** Supabase URL and anon key are hardcoded directly in the source code:

```typescript
export const supabaseUrl = 'https://bmwyusrojmrlmintpjks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtd3l1c3Jvam1ybG1pbnRwamtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDk2MDAsImV4cCI6MjA4MzMyNTYwMH0.5_vGwdT6X5U7KMdtblpyvWcsm-5xoSEMiORPetQqfgs';
```

**Impact:** 
- Credentials are bundled in the client app and visible to anyone who decompiles or inspects the app bundle
- Anon key can be extracted and used to make unauthorized API calls (though RLS should protect data)
- If RLS policies are misconfigured, this could lead to data exposure
- Credentials are committed to version control

**Evidence:**
- Hardcoded values in `src/lib/supabase.ts`
- README mentions `.env` file but code doesn't use environment variables
- No `.env` file found in repository (good, but credentials still hardcoded)

**Remediation:**
1. Move credentials to environment variables using Expo's `expo-constants`:
   ```typescript
   import Constants from 'expo-constants';
   
   export const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
     process.env.EXPO_PUBLIC_SUPABASE_URL;
   const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
     process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
   ```
2. Create `.env` file (add to `.gitignore`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Update `app.json` to use environment variables or EAS secrets
4. Rotate the exposed anon key in Supabase dashboard after fixing

---

### [CRITICAL] Hardcoded Supabase URL in Notifications

**Location:** `src/lib/notifications.ts:482`

**Issue:** Supabase URL is hardcoded again in the notifications module:

```typescript
const supabaseUrl = 'https://bmwyusrojmrlmintpjks.supabase.co';
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-push-notification`,
  // ...
);
```

**Impact:** Same as above - credentials/URL exposed in client bundle. Also creates maintenance burden (two places to update).

**Remediation:**
1. Import `supabaseUrl` from `src/lib/supabase.ts` instead of hardcoding
2. Better: Use environment variables as recommended above

---

### [HIGH] Missing File Upload Validation

**Location:** `src/screens/devotionals/hooks/useDevotionals.ts:192-241`

**Issue:** File upload validation is minimal:

```typescript
const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
const fileName = `${currentUserId}/${timestamp}.${fileExt}`;
```

**Problems:**
- File extension determined from filename (easily spoofed: `malicious.exe.jpg`)
- No MIME type validation
- No file size limits enforced client-side
- No server-side validation visible (relies on Supabase Storage policies)
- File type only checked via extension, not actual content

**Impact:**
- Attacker could upload executable files if Supabase Storage policies allow
- Potential for DoS via large file uploads
- If storage bucket is misconfigured, could serve malicious files

**Evidence:**
- Only extension-based validation: `imageUri.split('.').pop()`
- No size check before upload
- No content-type/MIME validation
- Image picker restricts to images, but direct API calls could bypass

**Remediation:**
1. Add file size validation:
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   const fileInfo = await FileSystem.getInfoAsync(imageUri);
   if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
     throw new Error('File too large');
   }
   ```
2. Validate MIME type from actual file, not just extension
3. Use allowlist for extensions: `['jpg', 'jpeg', 'png', 'webp']`
4. Verify Supabase Storage bucket policies restrict file types
5. Consider image processing/validation on server-side

---

### [HIGH] Missing Ownership Verification on Prayer Updates/Deletes

**Location:** `src/screens/prayers/PrayerWallScreen.tsx:248-312`

**Issue:** Prayer update and delete operations don't explicitly verify ownership:

```typescript
const { error } = await supabase
  .from('prayers')
  .update({ ... })
  .eq('id', editingPrayer.id);  // Only checks ID, not user_id
```

**Impact:** 
- If Supabase RLS policies are missing or misconfigured, users could modify/delete other users' prayers
- Relies entirely on database-level security (RLS policies)

**Evidence:**
- Update query: `.eq('id', editingPrayer.id)` - no user_id check
- Delete query: `.eq('id', selectedPrayer.id)` - no user_id check
- No explicit ownership verification in application code

**Note:** This may be safe if Supabase RLS policies are correctly configured, but application code should also verify ownership for defense-in-depth.

**Remediation:**
1. Add explicit ownership checks:
   ```typescript
   const { error } = await supabase
     .from('prayers')
     .update({ ... })
     .eq('id', editingPrayer.id)
     .eq('user_id', session.user.id);  // Verify ownership
   ```
2. Verify Supabase RLS policies exist and are correct:
   ```sql
   -- Example RLS policy
   CREATE POLICY "Users can update own prayers"
     ON prayers FOR UPDATE
     USING (auth.uid() = user_id);
   ```
3. Add server-side validation in Supabase Edge Functions if needed

---

### [HIGH] Missing Ownership Verification on Event Updates/Deletes

**Location:** `src/screens/events/EventsScreen.tsx` (similar pattern)

**Issue:** Event management operations may not verify ownership or admin status in application code.

**Impact:** Similar to prayers - if RLS is misconfigured, unauthorized modifications possible.

**Remediation:**
1. Verify RLS policies for events table
2. Add explicit checks in application code:
   ```typescript
   // For updates/deletes, verify user is creator or admin
   .eq('created_by', session.user.id)
   // OR check admin role via group_members
   ```
3. Review admin role checks in `updateGroupName` (line 294) - this one correctly checks role

---

### [MEDIUM] No Rate Limiting on Authentication Endpoints

**Location:** `src/context/AuthContext.tsx:71-90`

**Issue:** Login and signup endpoints have no rate limiting visible in client code.

**Impact:**
- Brute force attacks on passwords
- Account enumeration (checking if emails exist)
- DoS via excessive signup attempts

**Note:** Supabase may provide rate limiting at the service level, but it's not visible in this codebase.

**Remediation:**
1. Verify Supabase Auth rate limiting is enabled
2. Add client-side throttling (basic protection):
   ```typescript
   let lastAttempt = 0;
   const MIN_DELAY = 1000; // 1 second
   
   const signIn = async (email: string, password: string) => {
     const now = Date.now();
     if (now - lastAttempt < MIN_DELAY) {
       throw new Error('Please wait before trying again');
     }
     lastAttempt = now;
     // ... rest of sign in
   };
   ```
3. Consider implementing CAPTCHA for signup
4. Monitor for suspicious login patterns

---

### [MEDIUM] Password Requirements May Be Weak

**Location:** `src/screens/auth/SignUpScreen.tsx:45-46`

**Issue:** Password validation only checks minimum length:

```typescript
if (password.length < 6) {
  Alert.alert('Error', 'Password must be at least 6 characters');
}
```

**Impact:**
- Weak passwords allowed (e.g., "123456")
- No complexity requirements
- Users may choose easily guessable passwords

**Remediation:**
1. Add password strength requirements:
   ```typescript
   const hasMinLength = password.length >= 8;
   const hasUpperCase = /[A-Z]/.test(password);
   const hasLowerCase = /[a-z]/.test(password);
   const hasNumber = /\d/.test(password);
   
   if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
     Alert.alert('Error', 'Password must be at least 8 characters with uppercase, lowercase, and number');
   }
   ```
2. Consider using a password strength meter
3. Verify Supabase enforces password policies server-side

---

## Quick Wins

1. **Move all secrets to environment variables** - Use `EXPO_PUBLIC_*` for client-accessible vars
2. **Add explicit ownership checks** - Don't rely solely on RLS; verify in application code
3. **Add file upload validation** - Size limits, MIME type checks, extension allowlist
4. **Strengthen password requirements** - Minimum 8 chars with complexity
5. **Verify Supabase RLS policies** - Ensure all tables have proper Row Level Security enabled
6. **Rotate exposed credentials** - Generate new Supabase anon key after fixing hardcoded values

---

## Context

**Architecture:**
- React Native mobile app (Expo)
- Supabase backend (PostgreSQL + Auth + Storage)
- Client-side state management (Zustand)
- No custom backend API (direct Supabase client calls)

**Security Model:**
- Relies heavily on Supabase RLS (Row Level Security) policies
- JWT-based authentication via Supabase Auth
- Client-side validation only (no custom API layer)

**Dependencies:**
- `npm audit` shows no known vulnerabilities ✅
- Dependencies appear up-to-date

**Positive Findings:**
- No hardcoded credentials in `.env` files (they're hardcoded in source instead, but at least not in git)
- Using Supabase Auth (industry-standard authentication)
- TypeScript usage improves type safety
- No obvious SQL injection (using Supabase client, which parameterizes queries)
- No obvious XSS (React auto-escapes, no `dangerouslySetInnerHTML` found)
- No `eval` or `exec` usage found

---

## Recommendations Priority

### Immediate (Before Production)
1. ✅ Move Supabase credentials to environment variables
2. ✅ Rotate exposed anon key
3. ✅ Verify all Supabase RLS policies are correctly configured
4. ✅ Add explicit ownership checks to update/delete operations

### Short Term
5. Add file upload validation (size, type, content)
6. Strengthen password requirements
7. Add rate limiting verification/implementation

### Long Term
8. Consider adding a backend API layer for sensitive operations
9. Implement security monitoring/logging
10. Regular security audits of Supabase RLS policies
11. Add input sanitization for user-generated content

---

## Verification Checklist

Before considering this review complete, verify:

- [ ] Supabase credentials moved to environment variables
- [ ] Exposed anon key rotated in Supabase dashboard
- [ ] All RLS policies reviewed and tested
- [ ] File upload validation added
- [ ] Ownership checks added to all update/delete operations
- [ ] Password requirements strengthened
- [ ] Rate limiting confirmed (Supabase or custom)

---

## Notes

This is a **mobile application** using Supabase, which means:
- Some web security concerns (CORS, CSRF) are less relevant
- Client-side code is inherently exposed (app bundles can be decompiled)
- Security relies heavily on Supabase RLS policies
- The anon key being exposed is expected for Supabase, but it should still use env vars for flexibility

**Key Risk:** The hardcoded credentials are the most critical issue. While Supabase's anon key is designed to be public (protected by RLS), hardcoding it prevents environment-specific configurations and creates maintenance issues.

