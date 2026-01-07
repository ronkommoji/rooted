# 🚀 Deployment Guide - Rooted App

## Prerequisites

1. **EAS CLI installed globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into EAS:**
   ```bash
   eas login
   ```

3. **Apple Developer Account** - Make sure you have:
   - Active Apple Developer Program membership
   - App Store Connect access
   - Certificates and provisioning profiles set up (EAS handles this automatically)

---

## 📱 Building for TestFlight

### Step 1: Update Version (if needed)
The version is currently set to `1.0.1` in `app.json`. EAS will auto-increment the build number.

### Step 2: Build iOS Production Build

```bash
eas build --platform ios --profile production
```

This will:
- Create a production build
- Auto-increment the build number
- Generate certificates and provisioning profiles automatically
- Upload to EAS servers

**Note:** The build takes about 10-20 minutes. You'll get a URL to track progress.

### Step 3: Submit to TestFlight

Once the build completes, submit it to TestFlight:

```bash
eas submit --platform ios --profile production
```

This will:
- Upload the build to App Store Connect
- Process it for TestFlight (takes ~10-30 minutes)
- Make it available for internal/external testing

---

## 🔄 Quick Deploy (Build + Submit in one command)

You can also build and submit in one go:

```bash
eas build --platform ios --profile production --auto-submit
```

---

## 📋 Alternative: Preview Build (for testing)

If you want to test the build before submitting to TestFlight:

```bash
# Build preview version
eas build --platform ios --profile preview

# Install on device via TestFlight or direct install
```

---

## 🎯 What Happens Next

1. **Build completes** → You'll get a notification
2. **Submit completes** → Build appears in App Store Connect
3. **Processing** → Apple processes the build (10-30 min)
4. **TestFlight** → Build becomes available for testing
5. **Testers** → Add testers in App Store Connect → TestFlight tab

---

## 🔍 Check Build Status

```bash
# List all builds
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

---

## 📝 Important Notes

- **Version Number**: Update `version` in `app.json` for each release
- **Build Number**: Auto-incremented by EAS (configured in `eas.json`)
- **Certificates**: EAS manages these automatically
- **TestFlight**: First build may take longer to process

---

## 🐛 Troubleshooting

### Build fails?
- Check EAS dashboard: https://expo.dev/accounts/[your-account]/projects/rooted/builds
- Review build logs for errors

### Submit fails?
- Verify Apple ID and Team ID in `eas.json`
- Check App Store Connect for any issues
- Ensure you have the right permissions

### Need to revoke certificates?
```bash
eas credentials
```

---

## 📚 Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)

