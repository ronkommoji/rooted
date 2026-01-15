# EAS Environment Variables Setup

## Overview
For EAS builds, environment variables need to be set as **secrets** in EAS. Local `.env` files are not used during EAS builds.

## Setting Environment Variables in EAS

### Method 1: Using EAS CLI (Recommended)

```bash
# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"
```

### Method 2: Using EAS Web Dashboard

1. Go to https://expo.dev/accounts/[your-account]/projects/[your-project]/secrets
2. Click "Create Secret"
3. Add each variable:
   - **Name:** `EXPO_PUBLIC_SUPABASE_URL`
   - **Value:** Your Supabase project URL
   - **Name:** `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key

### Method 3: Using eas.json (Alternative)

You can also add environment variables directly in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

**Note:** This method stores secrets in plain text in your repo, which is less secure. Use secrets for production.

## Getting Your Supabase Credentials

1. Go to https://app.supabase.com/project/_/settings/api
2. Copy the **Project URL** → Use for `EXPO_PUBLIC_SUPABASE_URL`
3. Copy the **anon public** key → Use for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Local Development

For local development, create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Add `.env` to `.gitignore` to avoid committing secrets.

## Verifying Secrets Are Set

```bash
# List all secrets
eas secret:list

# Or use the new command
eas env:list
```

## After Setting Secrets

1. **Rebuild your app** - Secrets are baked into the build at build time
2. Secrets are automatically available as `process.env.EXPO_PUBLIC_*` variables
3. No code changes needed - the app will automatically use the secrets

## Troubleshooting

### App crashes on first launch
- Check that secrets are set: `eas secret:list`
- Verify secret names match exactly: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Rebuild the app after setting secrets

### Secrets not working
- Make sure you're using `EXPO_PUBLIC_` prefix (required for client-side access)
- Secrets are only available at build time, not runtime
- Clear build cache and rebuild: `eas build --clear-cache`
