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

## Quick Reference Commands

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight (after build completes)
eas submit --platform ios --latest

# Check build status
eas build:list

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
