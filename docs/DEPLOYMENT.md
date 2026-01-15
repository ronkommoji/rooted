# 🚀 Rooted App - Deployment Guide

## TestFlight Deployment

### Step 1: Build for iOS

```bash
eas build --platform ios --profile production
```

- Build takes **15-30 minutes**
- Monitor progress at the URL provided by EAS
- Or check status: `eas build:list`

### Step 2: Submit to TestFlight

After build completes, submit to TestFlight:

```bash
eas submit --platform ios --latest
```

This automatically:
- Finds your latest production build
- Uploads it to App Store Connect
- Submits it to TestFlight

### Step 3: Complete TestFlight Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → **Rooted** → **TestFlight** tab
3. Wait **5-10 minutes** for build processing
4. Fill out **Test Information**:
   - Beta App Description
   - Feedback Email
   - Privacy Policy URL (can be a simple link for testing)
5. Add **Internal Testers**:
   - Create a group (e.g., "Beta Testers")
   - Add testers by their Apple ID emails
   - They'll receive an email invitation to install via TestFlight app

## Accessing Specific Builds on Your Device

### Before Submitting to TestFlight

To test a specific build (e.g., build 9) on your phone before submitting to TestFlight:

#### Method 1: Using Build ID (Recommended)

1. **Find your build ID:**
   ```bash
   eas build:list --platform ios --limit 10
   ```
   Look for the build number you want (e.g., build 9) and copy its **Build ID**

2. **View build details:**
   ```bash
   eas build:view [BUILD_ID]
   ```
   Example: `eas build:view 7d4d3136-7d3b-412b-b029-1a1fe290b524`

3. **Access the build on your phone:**
   - Copy the **Logs URL** from the build output (format: `https://expo.dev/accounts/rkommoji7/projects/Rooted/builds/[BUILD_ID]`)
   - Open this URL on your iPhone's Safari browser
   - The page will show a **QR code and install link** for internal distribution builds
   - Tap the install link or scan the QR code to install directly on your device

#### Method 2: Using Preview Profile (For Testing Production Builds)

For production builds, use the `preview` profile which allows direct installation:

```bash
# Build with preview profile (internal distribution)
eas build --platform ios --profile preview

# After build completes, use the Logs URL to install
```

The preview profile creates an internal distribution build that can be installed directly without TestFlight.

#### Method 3: Filter by Build Number

```bash
# List builds filtered by build number
eas build:list --platform ios --app-build-version 9

# Then use eas build:view with the Build ID
```

### Important Notes

- **Production builds** (`--profile production`) with `distribution: store` **cannot** be installed directly on devices - they must go through TestFlight or App Store
- **Development builds** (`--profile development`) and **Preview builds** (`--profile preview`) can be installed directly via the build page URL
- The build must be **finished** before you can install it
- Build page URLs show QR codes and install links automatically for internal distribution builds

## Quick Reference Commands

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for testing (can install directly)
eas build --platform ios --profile preview

# Submit to TestFlight (after build completes)
eas submit --platform ios --latest

# Submit specific build to TestFlight
eas submit --platform ios --id [BUILD_ID]

# Check build status
eas build:list

# View specific build details
eas build:view [BUILD_ID]

# Filter builds by build number
eas build:list --platform ios --app-build-version 9

# OTA Update
eas update --branch production --message "Description of changes"

# List OTA updates on a branch
eas update:list --branch production

# View specific OTA update
eas update:view [UPDATE_ID]

# Revert OTA update (republish previous version)
eas update --branch production --message "Reverting to stable version"

# View project info
eas project:info
```

## Configuration

Your `eas.json` is already configured with:
- Apple ID: `ronkommoji@gmail.com`
- Team ID: `34V258BYBK`
- Project ID: `a89bfa54-b55b-4597-b84a-45e0123cd4ef`

## When to Rebuild vs OTA Update

### Rebuild Required For:
- Adding new native dependencies
- Changing `app.json` configuration
- Modifying native code
- Major version releases

### OTA Update (No Rebuild) For:
- JavaScript/TypeScript code changes
- UI updates
- Bug fixes
- Feature additions (if no native changes)

### OTA Update Command:
```bash
eas update --branch production --message "Description of changes"
```

## Making Updates After Initial Release

### For Minor Updates (JS/UI changes):
Use EAS Update (OTA) - fastest way:
```bash
eas update --branch production --message "Fixed bug in prayer wall"
eas update --branch developement --message "Some bugs in the devotionals upload and comments"
```
Users get the update automatically next time they open the app!

### For Major Updates (native code changes, new SDK):
You need a new build:
```bash
# 1. Increment version in app.json first
# 2. Build
eas build --platform ios --profile production
# 3. Submit
eas submit --platform ios --latest
```

## Reverting OTA Updates

If you deploy an OTA update and discover issues, you can quickly revert to the previous stable version.

### Method 1: Republish Previous Version (Recommended)

1. **Find the previous stable commit:**
   ```bash
   git log --oneline
   ```
   Identify the commit hash before the problematic update.

2. **Checkout that commit:**
   ```bash
   git checkout [previous-commit-hash]
   ```

3. **Publish to the same branch:**
   ```bash
   eas update --branch production --message "Reverting to stable version"
   ```
   This overwrites the bad update with the previous version.

4. **Switch back to your main branch:**
   ```bash
   git checkout main  # or your main branch name
   ```

### Method 2: List and View Updates

Check what updates are on a branch:

```bash
# List updates on a branch
eas update:list --branch production

# View details of a specific update
eas update:view [UPDATE_ID]
```

### Method 3: Point Branch to Specific Update

If you know the update ID of the good version:

```bash
# Point the branch to a specific update
eas update:republish --branch production --update-id [GOOD_UPDATE_ID]
```

### Important Notes About Reverting

- **Immediate effect**: Users get the previous version on their next app open
- **No rebuild needed**: OTA updates are JavaScript-only, so reverting is instant
- **Branch-based**: Each branch (e.g., `production`, `development`) has its own update history
- **Automatic rollback**: Users who already downloaded the bad update will automatically get the reverted version

### Best Practices

1. **Test on staging first:**
   ```bash
   eas update --branch staging --message "Test update"
   ```

2. **Use descriptive messages:**
   ```bash
   eas update --branch production --message "Revert: Fixed critical bug in v1.0.2"
   ```

3. **Keep a record**: Note which update IDs are stable for quick rollback

## Version Management

- **Version** (`app.json`): Visible to users (e.g., "1.0.1")
- **Build Number**: Auto-increments with `"autoIncrement": true` in `eas.json`

## Troubleshooting

### Build Fails
- Check EAS build logs at the provided URL
- Verify Apple Developer account is active
- Ensure certificates are valid

### Submit Fails
- Verify Apple ID and Team ID in `eas.json`
- Check that build completed successfully
- Ensure app exists in App Store Connect

### TestFlight Not Showing Build
- Wait 5-10 minutes for processing
- Check App Store Connect → TestFlight → Builds
- Verify build status is "Ready to Submit"

## Notes

- Push notifications require physical devices (not simulators)
- TestFlight builds expire after 90 days
- Internal testers can test immediately after build is processed
- External testing requires App Review (for production release)
