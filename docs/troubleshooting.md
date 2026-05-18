# Troubleshooting

Common setup and runtime issues.

---

# Missing OAuth Client File

Error:

```text
Missing OAuth client file
```

Cause:
- `oauth-client.json` missing
- incorrect `.env` path

Fix:
1. Download OAuth client JSON from Google Cloud
2. Place it in `/secrets`
3. Verify:

```env
GOOGLE_CLIENT_SECRET_PATH
```

---

# unauthorized_client

Error:

```text
unauthorized_client
```

Possible causes:
- incorrect OAuth setup
- Google account lacks access
- invalid property IDs
- wrong OAuth client type

Fix:
- verify GA4 property access
- verify OAuth consent screen
- use Desktop App OAuth client

---

# invalid_grant

Error:

```text
invalid_grant
```

Cause:
- expired/revoked token

Fix:
1. Delete:
   ```text
   oauth-token.json
   ```
2. Re-run authentication flow

---

# Module Not Found

Error:

```text
Cannot find module
```

Cause:
- dependencies not installed

Fix:

```bash
npm install
```

---

# node_modules Accidentally Committed

Fix:

```bash
git rm -r --cached node_modules
```

Ensure `.gitignore` contains:

```text
node_modules/
```

---

# Permission Denied

Possible causes:
- missing GA4 permissions
- missing GTM permissions
- missing Sheets access

Verify the Google account has access to the required resources.

---

# Scripts Produce Empty Outputs

Possible causes:
- incorrect property IDs
- no matching GA4 dimensions
- invalid query configuration
- empty datasets

Check:
- GA4 dimensions
- permissions
- date ranges

---

# Verify Current Environment

Recommended checks:

```bash
npm install
npm run ga4:url-extractor
```

Confirm:
- `.env` exists
- `/secrets` contains credentials
- APIs are enabled
```