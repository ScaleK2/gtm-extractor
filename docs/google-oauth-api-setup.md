# Google OAuth & API Setup

This document explains how to configure Google Cloud APIs and OAuth credentials for the Tracking Infra Audit Toolkit.

---

# Required APIs

Enable the following APIs in Google Cloud:

- Google Analytics Data API
- Google Tag Manager API
- Google Sheets API
- Google Drive API

---

# Step 1 — Create or Select a Google Cloud Project

1. Open:
   https://console.cloud.google.com/

2. Create a new project or select an existing one.

Recommended naming:

```text
tracking-infra-toolkit
```

---

# Step 2 — Enable APIs

Open:

```text
APIs & Services → Library
```

Enable:

- Google Analytics Data API
- Google Tag Manager API
- Google Sheets API
- Google Drive API

---

# Step 3 — Configure OAuth Consent Screen

Open:

```text
APIs & Services → OAuth Consent Screen
```

Recommended settings:

| Setting | Value |
|---|---|
| User Type | External |
| Publishing Status | Testing |
| App Name | Tracking Infra Toolkit |

Add your Google account as a test user.

---

# Step 4 — Create OAuth Client

Open:

```text
APIs & Services → Credentials
```

Click:

```text
Create Credentials → OAuth Client ID
```

Application type:

```text
Desktop App
```

Download the JSON file.

Rename it:

```text
oauth-client.json
```

Move it into:

```text
/secrets
```

---

# Step 5 — Configure Environment Variables

Create:

```text
.env
```

Example:

```env
GOOGLE_CLIENT_SECRET_PATH=./secrets/oauth-client.json
GOOGLE_TOKEN_PATH=./secrets/oauth-token.json
SHEETS_TOKEN_PATH=./secrets/sheets-token.json
```

---

# Step 6 — Generate OAuth Token

Run:

```bash
npm run ga4:url-extractor
```

The script will:

1. Generate an authorisation URL
2. Open Google login flow
3. Request access permissions
4. Generate a token file

This creates:

```text
oauth-token.json
```

inside:

```text
/secrets
```

---

# Step 7 — Confirm Permissions

Your Google account must have access to:

- GA4 properties
- GTM containers
- Google Sheets
- Google Drive folders

Otherwise you may see:

```text
unauthorized_client
permission_denied
```

---

# OAuth Login Flow

When running a script for the first time:

```bash
npm run ga4:url-extractor
```

the tool may request manual authorisation.

---

# What Happens

The script will:

1. Generate a Google authorisation URL
2. Ask you to open it in your browser
3. Request Google account login
4. Ask you to approve permissions

After approval, Google redirects to:

```text
http://localhost
```

The localhost page itself may fail to load.

This is normal.

---

# Important Step

After redirect, copy the value from:

```text
code=...
```

inside the browser URL.

Example:

```text
http://localhost/?code=4/0A...
```

Copy only the code value.

Paste it back into the terminal when prompted:

```text
Paste the code here:
```

---

# Result

The script exchanges the code for an OAuth token and creates:

```text
/secrets/oauth-token.json
```

This token is then reused for future runs.

---

# If Authentication Fails

Delete:

```text
/secrets/oauth-token.json
```

Then rerun the script to restart the OAuth flow.

---

# Security Notes

Never commit:

- OAuth credentials
- Tokens
- Client IDs
- Secrets

These should remain inside:

```text
/secrets
```

which is ignored by Git.