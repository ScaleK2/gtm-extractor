/**
 * GTM to Excel Exporter
 *
 * Creates:
 * 1. One detailed Excel workbook per GTM container
 * 2. One holistic container index workbook
 *
 * Raw JSON remains the source of truth.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const GTM_EXPORT_DIR = path.resolve(
  process.env.GTM_OUTPUT_DIR || './output/gtm_exports'
);

const EXCEL_OUTPUT_DIR = path.resolve(
  process.env.GTM_EXCEL_OUTPUT_DIR || './output/gtm_excel'
);

const CONTAINER_INDEX_OUTPUT_PATH = path.resolve(
  process.env.GTM_CONTAINER_INDEX_OUTPUT_PATH || './output/gtm-container-index.xlsx'
);

const EXCEL_CELL_LIMIT = 32000;

const INDEX_HEADERS = [
  'accountId',
  'containerId',
  'publicId',
  'containerName',
  'path',
  'name',
  'domainName',
  'notes',
  'usageContext',
  'fingerprint',
  'tagManagerUrl',
  'features.supportUserPermissions',
  'features.supportEnvironments',
  'features.supportWorkspaces',
  'features.supportGtagConfigs',
  'features.supportBuiltInVariables',
  'features.supportClients',
  'features.supportFolders',
  'features.supportTags',
  'features.supportTemplates',
  'features.supportTriggers',
  'features.supportVariables',
  'features.supportVersions',
  'features.supportZones',
  'features.supportTransformations',
  'tagCount',
  'triggerCount',
  'variableCount',
  'tagIdsPreview',
];

function ensureOutputDirs() {
  fs.mkdirSync(EXCEL_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CONTAINER_INDEX_OUTPUT_PATH), { recursive: true });
}

function safeFileName(value) {
  return String(value || 'unnamed')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    console.warn(`Could not parse JSON: ${filePath}`);
    return null;
  }
}

function safeCellValue(value, context, truncationLog) {
  if (value === null || value === undefined) return '';

  const output =
    typeof value === 'string'
      ? value
      : JSON.stringify(value);

  if (output.length > EXCEL_CELL_LIMIT) {
    truncationLog.push({
      sheet: context.sheet || '',
      rowType: context.rowType || '',
      itemName: context.itemName || '',
      field: context.field || '',
      originalLength: output.length,
      truncatedTo: EXCEL_CELL_LIMIT,
      note: 'Raw full value remains available in the JSON export files.',
    });

    return output.slice(0, EXCEL_CELL_LIMIT) + '... [TRUNCATED]';
  }

  return output;
}

function flattenObject(obj, prefix = '', context = {}, truncationLog = []) {
  const output = {};

  for (const [key, value] of Object.entries(obj || {})) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(
        output,
        flattenObject(value, newKey, context, truncationLog)
      );
    } else {
      output[newKey] = safeCellValue(
        value,
        { ...context, field: newKey },
        truncationLog
      );
    }
  }

  return output;
}

function getContainerFolders() {
  if (!fs.existsSync(GTM_EXPORT_DIR)) {
    throw new Error(`GTM export directory not found: ${GTM_EXPORT_DIR}`);
  }

  return fs
    .readdirSync(GTM_EXPORT_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(GTM_EXPORT_DIR, entry.name));
}

function getFeature(container, key) {
  return container?.features?.[key] ?? '';
}

function buildContainerIndexRow(folder) {
  const container = readJsonIfExists(path.join(folder, 'container.json'));
  const tags = readJsonIfExists(path.join(folder, 'tags.json'));
  const triggers = readJsonIfExists(path.join(folder, 'triggers.json'));
  const variables = readJsonIfExists(path.join(folder, 'variables.json'));

  const tagList = tags?.tag || [];
  const triggerList = triggers?.trigger || [];
  const variableList = variables?.variable || [];

  const tagIds = tagList.map(tag => tag.tagId).filter(Boolean);

  return {
    accountId: container?.accountId || '',
    containerId: container?.containerId || '',
    publicId: container?.publicId || '',
    containerName: container?.name || path.basename(folder),
    path: container?.path || '',
    name: container?.name || '',
    domainName: container?.domainName || '',
    notes: container?.notes || '',
    usageContext: Array.isArray(container?.usageContext)
      ? container.usageContext.join(', ')
      : container?.usageContext || '',
    fingerprint: container?.fingerprint || '',
    tagManagerUrl: container?.tagManagerUrl || '',
    'features.supportUserPermissions': getFeature(container, 'supportUserPermissions'),
    'features.supportEnvironments': getFeature(container, 'supportEnvironments'),
    'features.supportWorkspaces': getFeature(container, 'supportWorkspaces'),
    'features.supportGtagConfigs': getFeature(container, 'supportGtagConfigs'),
    'features.supportBuiltInVariables': getFeature(container, 'supportBuiltInVariables'),
    'features.supportClients': getFeature(container, 'supportClients'),
    'features.supportFolders': getFeature(container, 'supportFolders'),
    'features.supportTags': getFeature(container, 'supportTags'),
    'features.supportTemplates': getFeature(container, 'supportTemplates'),
    'features.supportTriggers': getFeature(container, 'supportTriggers'),
    'features.supportVariables': getFeature(container, 'supportVariables'),
    'features.supportVersions': getFeature(container, 'supportVersions'),
    'features.supportZones': getFeature(container, 'supportZones'),
    'features.supportTransformations': getFeature(container, 'supportTransformations'),
    tagCount: tagList.length,
    triggerCount: triggerList.length,
    variableCount: variableList.length,
    tagIdsPreview: tagIds.slice(0, 50).join(', '),
  };
}

function rowsForContainer(folder) {
  const truncationLog = [];

  const container = readJsonIfExists(path.join(folder, 'container.json'));
  const tags = readJsonIfExists(path.join(folder, 'tags.json'));
  const triggers = readJsonIfExists(path.join(folder, 'triggers.json'));
  const variables = readJsonIfExists(path.join(folder, 'variables.json'));
  const gtagConfig = readJsonIfExists(path.join(folder, 'gtag_config.json'));

  const containerName = container?.name || path.basename(folder);
  const accountId = container?.accountId || '';
  const containerId = container?.containerId || '';
  const publicId = container?.publicId || '';

  const baseMeta = {
    accountId,
    containerId,
    publicId,
    containerName,
  };

  const containerRows = container
    ? [{
        ...baseMeta,
        ...flattenObject(
          container,
          '',
          {
            sheet: 'Container',
            rowType: 'container',
            itemName: containerName,
          },
          truncationLog
        ),
      }]
    : [{ ...baseMeta, message: 'No container.json found' }];

  const tagRows = [];

  for (const tag of tags?.tag || []) {
    const tagName = tag.name || '';

    tagRows.push({
      ...baseMeta,
      tagId: tag.tagId || '',
      tagName,
      tagType: tag.type || '',
      firingTriggerId: safeCellValue(
        tag.firingTriggerId || [],
        {
          sheet: 'Tags',
          rowType: 'tag',
          itemName: tagName,
          field: 'firingTriggerId',
        },
        truncationLog
      ),
      blockingTriggerId: safeCellValue(
        tag.blockingTriggerId || [],
        {
          sheet: 'Tags',
          rowType: 'tag',
          itemName: tagName,
          field: 'blockingTriggerId',
        },
        truncationLog
      ),
      paused: tag.paused || false,
      ...flattenObject(
        tag,
        '',
        {
          sheet: 'Tags',
          rowType: 'tag',
          itemName: tagName,
        },
        truncationLog
      ),
    });
  }

  const triggerRows = [];

  for (const trigger of triggers?.trigger || []) {
    const triggerName = trigger.name || '';

    triggerRows.push({
      ...baseMeta,
      triggerId: trigger.triggerId || '',
      triggerName,
      triggerType: trigger.type || '',
      ...flattenObject(
        trigger,
        '',
        {
          sheet: 'Triggers',
          rowType: 'trigger',
          itemName: triggerName,
        },
        truncationLog
      ),
    });
  }

  const variableRows = [];

  for (const variable of variables?.variable || []) {
    const variableName = variable.name || '';

    variableRows.push({
      ...baseMeta,
      variableId: variable.variableId || '',
      variableName,
      variableType: variable.type || '',
      ...flattenObject(
        variable,
        '',
        {
          sheet: 'Variables',
          rowType: 'variable',
          itemName: variableName,
        },
        truncationLog
      ),
    });
  }

  const gtagConfigRows = [];

  const gtagItems =
    gtagConfig?.gtagConfig ||
    gtagConfig?.gtag_config ||
    [];

  for (const item of gtagItems) {
    const itemName =
      item.name ||
      item.measurementId ||
      '';

    gtagConfigRows.push({
      ...baseMeta,
      ...flattenObject(
        item,
        '',
        {
          sheet: 'GTag_Config',
          rowType: 'gtag_config',
          itemName,
        },
        truncationLog
      ),
    });
  }

  return {
    containerName,
    containerId,
    sheets: {
      Container: containerRows,
      Tags: tagRows,
      Triggers: triggerRows,
      Variables: variableRows,
      GTag_Config: gtagConfigRows,
      Truncation_Log: truncationLog,
    },
  };
}

function addSheet(workbook, sheetName, rows, headers = null) {
  const safeRows =
    rows.length > 0
      ? rows
      : [{ message: 'No data found' }];

  const worksheet = headers
    ? XLSX.utils.json_to_sheet(safeRows, { header: headers })
    : XLSX.utils.json_to_sheet(safeRows);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function exportContainerWorkbook(folder) {
  const { containerName, containerId, sheets } = rowsForContainer(folder);

  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    addSheet(workbook, sheetName, rows);
  }

  const fileName = safeFileName(`${containerName} (${containerId}).xlsx`);
  const outputPath = path.join(EXCEL_OUTPUT_DIR, fileName);

  XLSX.writeFile(workbook, outputPath);

  console.log(`Created container workbook: ${outputPath}`);
}

function exportContainerIndexWorkbook(folders) {
  const rows = folders.map(buildContainerIndexRow);

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, 'Containers', rows, INDEX_HEADERS);

  XLSX.writeFile(workbook, CONTAINER_INDEX_OUTPUT_PATH);

  console.log(`Created container index workbook: ${CONTAINER_INDEX_OUTPUT_PATH}`);
}

function main() {
  ensureOutputDirs();

  const folders = getContainerFolders();

  console.log(`Found ${folders.length} GTM container export folders.`);

  for (const folder of folders) {
    exportContainerWorkbook(folder);
  }

  exportContainerIndexWorkbook(folders);

  console.log('\nExcel exports complete.');
  console.log(`Container workbooks: ${EXCEL_OUTPUT_DIR}`);
  console.log(`Container index: ${CONTAINER_INDEX_OUTPUT_PATH}`);
}

main();