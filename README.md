# GTM Extractor

A standalone Google Tag Manager export and audit utility.

This repository helps you:
- authenticate with the Google Tag Manager API
- export GTM containers
- extract tags, triggers, variables, workspaces, and GTAG config
- generate Excel audit files for review and documentation

---

# Cost Expectations

For the normal workflow in this repository, expected Google Cloud cost is **$0**.

This tool:
- reads Google Tag Manager configuration through the Google Tag Manager API
- writes JSON and Excel files to your local machine
- does **not** create Google Cloud compute, database, storage bucket, Pub/Sub, BigQuery, or server-side tagging resources
- does **not** require a Google Cloud Storage bucket

Important billing notes:
- A Google Cloud project is required only so the OAuth app can be registered and the Google Tag Manager API can be enabled.
- The Google Tag Manager API is controlled by quota limits, including daily and per-second request quotas.
- Google Cloud billing is project-level, and some Google APIs or resources can charge if you enable or use them separately.
- To minimize billing risk, use a dedicated Google Cloud project for this utility and enable only the **Google Tag Manager API**.
- Do not enable or create unrelated paid resources unless you intentionally need them.

Useful Google references:
- Google Tag Manager API limits and quotas: https://developers.google.com/tag-platform/tag-manager/api/v2/limits-quotas
- Google Cloud API billing overview: https://cloud.google.com/apis/docs/getting-started

---

# Prerequisites

Before using this tool, ensure you have:

- Git installed
- Node.js 18+ installed
- Access to a Google Tag Manager account
- A Google Cloud project for OAuth/API registration
- Google Tag Manager API enabled in that project
- OAuth Desktop App credentials downloaded from Google Cloud Console

---

# Features

- OAuth-based GTM authentication
- Multi-account GTM export
- Resumable container exports
- Per-container Excel workbooks
- Holistic container index workbook
- Truncation logging for oversized Excel cells
- Environment-variable configuration
- Optional guided local menu for overview and common commands
- Optional container ID filtering for single-container exports

---

# Repository Structure

```text
gtm-extractor/
├─ README.md
├─ package.json
├─ package-lock.json
├─ src/
│  ├─ gtm-export.js      # exports GTM JSON
│  ├─ gtm-to-excel.js    # converts JSON exports to Excel
│  └─ run.js             # optional guided menu
├─ examples/
├─ docs/
├─ output/      # generated locally; do not commit
└─ secrets/     # local OAuth credentials/tokens; do not commit
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

# Google Cloud API Setup

Use this section if you do not already have a Google Cloud project and OAuth client available.

## 1. Create or select a Google Cloud project

1. Open Google Cloud Console:
   ```text
   https://console.cloud.google.com/
   ```
2. Create a new project or select an existing project.
3. Recommended: use a dedicated project name such as:
   ```text
   gtm-extractor
   ```

A dedicated project makes it easier to audit usage, keep credentials separate, and avoid enabling unrelated paid services.

## 2. Enable only the Google Tag Manager API

1. In Google Cloud Console, open:
   ```text
   APIs & Services → Library
   ```
2. Search for:
   ```text
   Google Tag Manager API
   ```
3. Click **Enable**.

You do not need Google Cloud Storage, Compute Engine, BigQuery, Cloud Run, or a database for this repository's default local export workflow.

## 3. Configure the OAuth consent screen

1. Open:
   ```text
   APIs & Services → OAuth consent screen
   ```
2. Choose **External** unless your Google Workspace organization requires **Internal**.
3. Set a simple app name, for example:
   ```text
   GTM Extractor Local Tool
   ```
4. Add your email address for user support/developer contact fields.
5. Add your Google account as a test user if the consent screen is in testing mode.

The required OAuth scope is:

```text
https://www.googleapis.com/auth/tagmanager.readonly
```

## 4. Create OAuth Desktop App credentials

1. Open:
   ```text
   APIs & Services → Credentials
   ```
2. Click:
   ```text
   Create Credentials → OAuth client ID
   ```
3. Select application type:
   ```text
   Desktop app
   ```
4. Name it, for example:
   ```text
   GTM Extractor Desktop Client
   ```
5. Download the JSON credential file.
6. Create a local `secrets` folder in this repo if it does not already exist:
   ```bash
   mkdir -p secrets
   ```
7. Rename/move the downloaded file to:
   ```text
   secrets/oauth-client.json
   ```

Do not commit files from `secrets/`. They contain OAuth client and token material.

## 5. Confirm GTM access

The Google account used during OAuth must have access to the target Google Tag Manager account(s) and container(s). This tool cannot export GTM resources that your Google account cannot read.

---

# Environment Setup

Create a local `.env` file in the repo root:

```bash
cp .env.example .env
```

If `.env.example` is not present in your checkout, create `.env` manually:

```bash
touch .env
```

Example `.env`:

```env
GOOGLE_CLIENT_SECRET_PATH=./secrets/oauth-client.json
GOOGLE_TOKEN_PATH=./secrets/oauth-token.json

GTM_ACCOUNT_IDS=123456
# Optional: limit exports/XLSX generation to specific container IDs or public IDs.
# Leave blank or omit to include every container in each GTM_ACCOUNT_IDS account.
GTM_CONTAINER_IDS=GTM-ABC123,987654
GTM_OUTPUT_DIR=./output/gtm_exports
GTM_PROGRESS_FILE=./output/gtm-progress.json

GTM_EXCEL_OUTPUT_DIR=./output/gtm_excel
GTM_CONTAINER_INDEX_OUTPUT_PATH=./output/gtm-container-index.xlsx
```

For multiple GTM accounts, separate account IDs with commas:

```env
GTM_ACCOUNT_IDS=123456,789101
```

By default, the exporter includes **every container** in each configured GTM account. To export or convert only specific containers, set `GTM_CONTAINER_IDS` to one or more GTM container IDs or public IDs:

```env
GTM_CONTAINER_IDS=987654,GTM-ABC123
```

Leave `GTM_CONTAINER_IDS` blank or remove it to process all containers in each configured account.

---

# Finding Your GTM Account ID

In Google Tag Manager:

1. Open the GTM account you want to export.
2. Look at the URL or account settings.
3. Use the numeric account ID, not the container ID.

Example:

```env
GTM_ACCOUNT_IDS=123456
```

---

# How It Runs

This project has two main steps:

1. **Export JSON from GTM** with `src/gtm-export.js`. This contacts the Google Tag Manager API, lists containers for each account in `GTM_ACCOUNT_IDS`, optionally filters them with `GTM_CONTAINER_IDS`, and writes raw JSON files under `GTM_OUTPUT_DIR`.
2. **Generate Excel workbooks** with `src/gtm-to-excel.js`. This reads the local JSON export folders, optionally applies the same `GTM_CONTAINER_IDS` filter, and writes Excel files under `GTM_EXCEL_OUTPUT_DIR`.

The JSON export remains the source of truth. Excel files are generated audit views built from the local JSON files.

## Should You Use the Menu?

The menu is optional. It is useful if you want a quick overview of configuration and a guided choice between export, Excel generation, or both. It does not add new Google Cloud behavior and does not call Google APIs until you choose an export action.

Run the menu:

```bash
npm run menu
```

If you already know the command you want, the direct commands below are simpler and better for automation.

# Running the Tool

Export GTM data:

```bash
npm run start
```

or:

```bash
npm run export
```

Generate Excel audit files after JSON exports exist:

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
npm run menu
```

Shows a local guided menu with setup overview and common actions.

```bash
npm run test
```

Placeholder test command.

---

# OAuth Flow

On first run:

1. The script generates a Google authorization URL.
2. Open the URL in your browser.
3. Sign in with the Google account that has GTM access.
4. Approve GTM read-only access.
5. Google redirects to `localhost`.
6. The browser page may fail to load; this is normal for the manual desktop flow.
7. Copy the returned `code=...` value from the browser URL.
8. Paste the code into the terminal.

The tool then generates:

```text
secrets/oauth-token.json
```

for future authenticated requests.

If the token expires, is revoked, or has the wrong permissions, delete `secrets/oauth-token.json` and rerun the export command to repeat the OAuth flow.

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

---

# Security Notes

Never commit:

- `secrets/oauth-client.json`
- `secrets/oauth-token.json`
- `.env`
- generated output files containing client/container data

Recommended local folder permissions:

```bash
chmod 700 secrets
```

---

# Troubleshooting

More troubleshooting notes are available in:

```text
docs/troubleshooting.md
```

Common issues:

- **Missing OAuth client file**: confirm `GOOGLE_CLIENT_SECRET_PATH` points to `secrets/oauth-client.json`.
- **No GTM account IDs found**: set `GTM_ACCOUNT_IDS` in `.env`.
- **unauthorized_client**: confirm the OAuth client type is **Desktop app** and your account is listed as a test user if required.
- **permission_denied**: confirm the Google account has access to the GTM account/container.
- **invalid_grant**: delete `secrets/oauth-token.json` and rerun the OAuth flow.
- **Quota errors**: rerun later; the exporter is designed to be safe to rerun and records progress.
