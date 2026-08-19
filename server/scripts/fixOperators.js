const fs = require('fs');
const path = require('path');

const files = [
  'controllers/alertController.js',
  'controllers/assetController.js',
  'controllers/auditLogController.js',
  'controllers/billController.js',
  'controllers/brandController.js',
  'controllers/categoryController.js',
  'controllers/dashboardController.js',
  'controllers/departmentController.js',
  'controllers/expenseController.js',
  'controllers/productController.js',
  'controllers/projectController.js',
  'controllers/returnController.js',
  'controllers/RR_purchaseOrderController.js',
  'controllers/RR_supplierController.js',
  'controllers/salaryController.js',
  'controllers/unitController.js',
  'services/alertService.js',
  'services/autoReorderService.js',
  'services/batchService.js',
];

const replacements = [
  [/\[Op\.ne\]/g,      '$ne'],
  [/\[Op\.like\]/g,    '$like'],
  [/\[Op\.iLike\]/g,   '$iLike'],
  [/\[Op\.gt\]/g,      '$gt'],
  [/\[Op\.gte\]/g,     '$gte'],
  [/\[Op\.lt\]/g,      '$lt'],
  [/\[Op\.lte\]/g,     '$lte'],
  [/\[Op\.in\]/g,      '$in'],
  [/\[Op\.notIn\]/g,   '$notIn'],
  [/\[Op\.between\]/g, '$between'],
  [/\[Op\.or\]/g,      '$or'],
  [/\[Op\.and\]/g,     '$and'],
];

const base = path.join(__dirname, '..');

for (const file of files) {
  const fullPath = path.join(base, file);
  if (!fs.existsSync(fullPath)) { console.log('SKIP (not found):', file); continue; }
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const next = content.replace(pattern, replacement);
    if (next !== content) { changed = true; content = next; }
  }
  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('FIXED:', file);
  } else {
    console.log('no change:', file);
  }
}
console.log('Done.');
