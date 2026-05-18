/**
 * GTM Exporter
 * Standalone, resumable, quota-safe GTM container exporter.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const GOOGLE_CLIENT_SECRET_PATH = path.resolve(
  process.env.GOOGLE_CLIENT_SECRET_PATH || './secrets/oauth-client.json'
);

const GOOGLE_TOKEN_PATH = path.resolve(
  process.env.GOOGLE_TOKEN_PATH || './secrets/oauth-token.json'
);

const OUTPUT_DIR = path.resolve(
  process.env.GTM_OUTPUT_DIR || './output/gtm_exports'
);

const PROGRESS_FILE = path.resolve(
  process.env.GTM_PROGRESS_FILE || './output/gtm-progress.json'
);

const ACCOUNT_IDS = (process.env.GTM_ACCOUNT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const SCOPES = ['https://www.googleapis.com/auth/tagmanager.readonly'];

function validateConfig() {
  if (!fs.existsSync(GOOGLE_CLIENT_SECRET_PATH)) {
    throw new Error(`Missing OAuth client file:\n${GOOGLE_CLIENT_SECRET_PATH}`);
  }

  if (ACCOUNT_IDS.length === 0) {
    throw new Error(
      'No GTM account IDs found.\nAdd GTM_ACCOUNT_IDS to your .env file, e.g.\nGTM_ACCOUNT_IDS=123456,789101'
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.mkdirSync(path.dirname(GOOGLE_TOKEN_PATH), { recursive: true });
}

function safeName(str) {
  return String(str || 'unnamed')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return {};

  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function getOAuthClient() {
  const credentials = JSON.parse(
    fs.readFileSync(GOOGLE_CLIENT_SECRET_PATH, 'utf8')
  );

  if (!credentials.installed) {
    throw new Error(
      'OAuth client file is missing the "installed" object. Use a Desktop App OAuth client JSON.'
    );
  }

  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(GOOGLE_TOKEN_PATH)) {
    oAuth2Client.setCredentials(
      JSON.parse(fs.readFileSync(GOOGLE_TOKEN_PATH, 'utf8'))
    );
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n== AUTHORISE THIS APP ==');
  console.log('Open this URL in your browser:\n');
  console.log(authUrl);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise(resolve => {
    readline.question('\nPaste the code here: ', answer => {
      readline.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(GOOGLE_TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`\nOAuth token saved to: ${GOOGLE_TOKEN_PATH}\n`);

  return oAuth2Client;
}

async function gtmGet(auth, url, label, maxRetries = 5) {
  const baseDelayMs = 1500;
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      await sleep(baseDelayMs);

      const res = await auth.request({
        url,
        method: 'GET',
      });

      return res.data;
    } catch (err) {
      const msg = err.message || '';
      const status = err.code || err.status || err.response?.status;

      const isQuota =
        status === 429 ||
        msg.includes('Quota exceeded') ||
        msg.includes('Rate Limit Exceeded');

      if (!isQuota || attempt > maxRetries) {
        console.error(`Failed ${label} attempt ${attempt}:`, msg || err);
        throw err;
      }

      const backoffMs = baseDelayMs * Math.pow(2, attempt);

      console.warn(
        `Quota hit for ${label}. Waiting ${Math.round(
          backoffMs / 1000
        )}s before retry ${attempt}/${maxRetries}...`
      );

      await sleep(backoffMs);
    }
  }
}

async function exportContainer(auth, accountId, container, progress) {
  const containerId = container.containerId;
  const containerKey = `${accountId}:${containerId}`;
  const baseName = `${safeName(container.name)} (${containerId})`;
  const containerDir = path.join(OUTPUT_DIR, baseName);
  const exportFilePath = path.join(containerDir, 'export.json');

  if (progress[containerKey]?.done && fs.existsSync(exportFilePath)) {
    console.log(`Skipping already exported: ${container.name} (${containerId})`);
    return;
  }

  fs.mkdirSync(containerDir, { recursive: true });

  console.log(`Exporting container: ${container.name} (${containerId})`);

  const containerPath = `accounts/${accountId}/containers/${containerId}`;
  const baseUrl = 'https://www.googleapis.com/tagmanager/v2';

  const exportObj = {
    accountId,
    container,
    workspaces: null,
    tags: null,
    triggers: null,
    variables: null,
    gtag_config: null,
  };

  try {
    const workspaces = await gtmGet(
      auth,
      `${baseUrl}/${containerPath}/workspaces`,
      `workspaces for ${container.name}`
    );

    exportObj.workspaces = workspaces;

    fs.writeFileSync(
      path.join(containerDir, 'workspaces.json'),
      JSON.stringify(workspaces, null, 2)
    );

    const firstWorkspace = workspaces.workspace?.[0] || null;

    if (!firstWorkspace) {
      console.log(`No workspaces found for ${container.name}`);
    } else {
      const workspaceId = firstWorkspace.workspaceId;
      const workspacePath = `${containerPath}/workspaces/${workspaceId}`;

      const tags = await gtmGet(
        auth,
        `${baseUrl}/${workspacePath}/tags`,
        `tags for ${container.name}`
      );

      exportObj.tags = tags;

      fs.writeFileSync(
        path.join(containerDir, 'tags.json'),
        JSON.stringify(tags, null, 2)
      );

      const triggers = await gtmGet(
        auth,
        `${baseUrl}/${workspacePath}/triggers`,
        `triggers for ${container.name}`
      );

      exportObj.triggers = triggers;

      fs.writeFileSync(
        path.join(containerDir, 'triggers.json'),
        JSON.stringify(triggers, null, 2)
      );

      const variables = await gtmGet(
        auth,
        `${baseUrl}/${workspacePath}/variables`,
        `variables for ${container.name}`
      );

      exportObj.variables = variables;

      fs.writeFileSync(
        path.join(containerDir, 'variables.json'),
        JSON.stringify(variables, null, 2)
      );

      try {
        const gtagConfig = await gtmGet(
          auth,
          `${baseUrl}/${workspacePath}/gtag_config`,
          `gtag_config for ${container.name}`
        );

        exportObj.gtag_config = gtagConfig;

        fs.writeFileSync(
          path.join(containerDir, 'gtag_config.json'),
          JSON.stringify(gtagConfig, null, 2)
        );
      } catch (err) {
        console.warn(`Skipping gtag_config for ${container.name}: ${err.message || err}`);
      }
    }

    fs.writeFileSync(
      path.join(containerDir, 'container.json'),
      JSON.stringify(container, null, 2)
    );

    fs.writeFileSync(exportFilePath, JSON.stringify(exportObj, null, 2));

    progress[containerKey] = {
      done: true,
      timestamp: new Date().toISOString(),
    };

    saveProgress(progress);

    console.log(`Exported to: ${containerDir}`);
  } catch (err) {
    console.error(`Error exporting ${container.name}:`, err.message || err);
  }
}

async function run() {
  validateConfig();

  const auth = await getOAuthClient();
  const progress = loadProgress();

  for (const accountId of ACCOUNT_IDS) {
    console.log(`\nFetching containers for GTM account: ${accountId}`);

    const containersUrl =
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;

    const containerList = await gtmGet(
      auth,
      containersUrl,
      `container list for account ${accountId}`
    );

    const containers = containerList.container || [];

    console.log(`Found ${containers.length} containers.\n`);

    for (const container of containers) {
      await exportContainer(auth, accountId, container, progress);
    }
  }

  console.log('\nAll GTM exports attempted. Safe to rerun.');
}

run().catch(err => {
  console.error('\nFatal error:');
  console.error(err.message || err);
  process.exit(1);
});