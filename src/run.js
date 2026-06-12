/**
 * GTM Extractor menu
 * Lightweight local launcher for setup overview and common commands.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const ACCOUNT_IDS = (process.env.GTM_ACCOUNT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const CONTAINER_IDS = (process.env.GTM_CONTAINER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const GOOGLE_CLIENT_SECRET_PATH = path.resolve(
  process.env.GOOGLE_CLIENT_SECRET_PATH || './secrets/oauth-client.json'
);

const GOOGLE_TOKEN_PATH = path.resolve(
  process.env.GOOGLE_TOKEN_PATH || './secrets/oauth-token.json'
);

const GTM_OUTPUT_DIR = path.resolve(
  process.env.GTM_OUTPUT_DIR || './output/gtm_exports'
);

const GTM_EXCEL_OUTPUT_DIR = path.resolve(
  process.env.GTM_EXCEL_OUTPUT_DIR || './output/gtm_excel'
);

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function showOverview() {
  console.log('\nGTM Extractor');
  console.log('=============');
  console.log('This local menu does not call Google APIs until you choose an export action.');
  console.log('Default flow: export GTM JSON first, then generate Excel audit files.\n');

  console.log('Current configuration');
  console.log(`- .env loaded account IDs: ${ACCOUNT_IDS.length ? ACCOUNT_IDS.join(', ') : '(none)'}`);
  console.log(`- Optional container filter: ${CONTAINER_IDS.length ? CONTAINER_IDS.join(', ') : '(none; all containers in each account will be exported)'}`);
  console.log(`- OAuth client file exists: ${yesNo(fs.existsSync(GOOGLE_CLIENT_SECRET_PATH))}`);
  console.log(`- OAuth token file exists: ${yesNo(fs.existsSync(GOOGLE_TOKEN_PATH))}`);
  console.log(`- JSON output directory: ${GTM_OUTPUT_DIR}`);
  console.log(`- Excel output directory: ${GTM_EXCEL_OUTPUT_DIR}\n`);
}

function runCommand(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', code => {
      resolve(code || 0);
    });
  });
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  showOverview();

  console.log('Choose an action:');
  console.log('1) Export GTM JSON');
  console.log('2) Generate Excel workbooks from existing JSON exports');
  console.log('3) Export GTM JSON, then generate Excel workbooks');
  console.log('4) Show overview only');
  console.log('5) Exit');

  const answer = await ask('\nEnter 1-5: ');

  if (answer === '1') {
    process.exit(await runCommand('node', ['src/gtm-export.js']));
  }

  if (answer === '2') {
    process.exit(await runCommand('node', ['src/gtm-to-excel.js']));
  }

  if (answer === '3') {
    const exportCode = await runCommand('node', ['src/gtm-export.js']);
    if (exportCode !== 0) process.exit(exportCode);
    process.exit(await runCommand('node', ['src/gtm-to-excel.js']));
  }

  if (answer === '4') {
    process.exit(0);
  }

  if (answer === '5') {
    process.exit(0);
  }

  console.error('Unknown selection. Run npm run menu and choose 1-5.');
  process.exit(1);
}

main();
