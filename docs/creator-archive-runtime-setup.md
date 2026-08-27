# Creator Archive Runtime Setup (Windows)

One-time setup for GUCC Google Drive Lightweight Project Archive.

## Prerequisite

In one Google Cloud project:

- Enable Google Drive API.
- Create an OAuth 2.0 Client ID for a **Desktop app**. Use its Client ID as `GUCC_GOOGLE_CLIENT_ID`.
- Keep the OAuth client secret / refresh token out of Git and logs.

Only if setup reports that the existing GUCC root is not accessible with `drive.file` (403/404), also enable Google Picker API and prepare:

- `GUCC_GOOGLE_PICKER_API_KEY`: API key from **Google Cloud Console → APIs & Services → Credentials**.
- `GUCC_GOOGLE_APP_ID`: the Cloud **project number** from **IAM & Admin → Settings**.

Picker variables are not required when the fixed GUCC root probe already succeeds.

## PowerShell

```powershell
$env:GUCC_GOOGLE_CLIENT_ID = "<OAuth Desktop Client ID>"
npm run creator:archive -- --setup-drive
```

If the command asks for Picker authorization after a 403/404:

```powershell
$env:GUCC_GOOGLE_PICKER_API_KEY = "<API key>"
$env:GUCC_GOOGLE_APP_ID = "<Cloud project number>"
npm run creator:archive -- --setup-drive
```

Select the existing **GUCC Creator Projects** folder only. The expected root ID is:

`1wVMD-nIk6ArtGDi5gyOCmhW1pY-iRM9L`

Successful setup prints the `drive.file` scope, confirms root authorization, and saves the local OAuth config at:

`%USERPROFILE%\.gucc\creator-archive-google-oauth.json`

Do not commit or print that file. GUCC Archive uploads lightweight `.md/.json/.srt/.csv/.txt/.vtt` knowledge files only; media files are never part of the Archive package.

## Re-authorize / revoke

To re-authorize, revoke the app grant in your Google Account, remove the local OAuth config, then run `--setup-drive` again. Keep the config after successful field acceptance for normal future Archive runs.
