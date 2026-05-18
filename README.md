# GTM Extractor

A standalone Google Tag Manager export and audit utility.

This repository helps you:
- authenticate with the Google Tag Manager API
- export GTM containers
- extract tags, triggers, variables, workspaces, and GTAG config
- generate Excel audit files for review and documentation

---

# Prerequisites

Before using this tool, ensure you have:

- Git installed
- Node.js installed
- Access to a Google Tag Manager account
- A Google Cloud project
- Google Tag Manager API enabled
- OAuth Desktop App credentials

---

# Features

- OAuth-based GTM authentication
- Multi-account GTM export
- Resumable container exports
- Per-container Excel workbooks
- Holistic container index workbook
- Truncation logging for oversized Excel cells
- Environment-variable configuration

---

# Repository Structure

```text
gtm-extractor/
├─ README.md
├─ package.json
├─ package-lock.json
├─ .env.example
├─ .gitignore
├─ src/
├─ examples/
├─ output/
└─ secrets/
```

---

# Verify Node.js Installation

Check Node.js is installed:

```bash
node -v
```

Check npm is installed:

```bash
npm -v
```

If these commands fail, install Node.js from:

```text
https://nodejs.org/
```

Recommended version:
- Node.js 18+

---

# Installation

Clone the repository:

```bash
git clone https://github.com/ScaleK2/gtm-extractor.git
cd gtm-extractor
```

Install dependencies:

```bash
npm install
```

---

# Environment Setup

Copy:

```text
.env.example
```

to:

```text
.env
```

Example:

```env
GOOGLE_CLIENT_SECRET_PATH=./secrets/oauth-client.json
GOOGLE_TOKEN_PATH=./secrets/oauth-token.json

GTM_ACCOUNT_IDS=123456
GTM_OUTPUT_DIR=./output/gtm_exports
GTM_PROGRESS_FILE=./output/gtm-progress.json

GTM_EXCEL_OUTPUT_DIR=./output/gtm_excel
GTM_CONTAINER_INDEX_OUTPUT_PATH=./output/gtm-container-index.xlsx
```

---

# Google OAuth Setup

Required API:

```text
Google Tag Manager API
```

Required OAuth scope:

```text
https://www.googleapis.com/auth/tagmanager.readonly
```

Create a Google OAuth Desktop App credential and save it as:

```text
secrets/oauth-client.json
```

---

# Running the Tool

Export GTM data:

```bash
npm run start
```

or:

```bash
npm run export
```

Generate Excel audit files:

```bash
npm run export:xlsx
```

---

# Available Commands

```bash
npm run start
```

Runs the GTM JSON exporter.

```bash
npm run export
```

Same as `start`. Exports GTM containers into JSON files.

```bash
npm run export:xlsx
```

Converts exported GTM JSON files into Excel audit files.

```bash
npm run test
```

Placeholder test command.

---

# OAuth Flow

On first run:

1. The script generates a Google authorisation URL
2. Open the URL in your browser
3. Approve GTM read-only access
4. Google redirects to `localhost`
5. Copy the returned `code=...`
6. Paste the code into the terminal

The tool then generates:

```text
secrets/oauth-token.json
```

for future authenticated requests.

---

# Outputs

Raw GTM exports:

```text
output/gtm_exports/
```

Per-container Excel audit files:

```text
output/gtm_excel/
```

Holistic container index workbook:

```text
output/gtm-container-index.xlsx
```

---

# Excel Output Structure

Each container workbook includes:

```text
Container
Tags
Triggers
Variables
GTag_Config
Truncation_Log
```

The holistic index workbook includes one tab:

```text
Containers
```

This acts as a GTM inventory and governance reference.

---

# Security

Never commit:

- `.env`
- `secrets/`
- OAuth credentials
- OAuth tokens
- `output/`
- exported GTM data
- generated Excel files

These should be excluded by `.gitignore`.

---

# Troubleshooting

## Insufficient Permission

Usually means the OAuth token does not have GTM permissions.

Fix:

```text
Delete secrets/oauth-token.json
```

Then rerun:

```bash
npm run start
```

## Missing OAuth Client File

Ensure this file exists:

```text
secrets/oauth-client.json
```

## No GTM Accounts Found

Check:

```env
GTM_ACCOUNT_IDS=123456
```

Also confirm your Google account has access to the GTM account.

---

# Current Status

Standalone GTM extraction and Excel export utility.

Raw JSON remains the source of truth. Excel outputs are generated audit views.