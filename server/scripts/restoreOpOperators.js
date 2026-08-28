const fs = require('fs');
const path = require('path');

function getAllJsFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllJsFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const serverDir = path.join(__dirname, '..');
const jsFiles = getAllJsFiles(serverDir);

const operatorReplacements = [
  // Fix specific object key patterns
  [/\$ne\b/g, '[Op.ne]'],
  [/\$like\b/g, '[Op.like]'],
  [/\$iLike\b/g, '[Op.iLike]'],
  [/\$gt\b/g, '[Op.gt]'],
  [/\$gte\b/g, '[Op.gte]'],
  [/\$lt\b/g, '[Op.lt]'],
  [/\$lte\b/g, '[Op.lte]'],
  [/\$in\b/g, '[Op.in]'],
  [/\$notIn\b/g, '[Op.notIn]'],
  [/\$between\b/g, '[Op.between]'],
  [/\$or\b/g, '[Op.or]'],
  [/\$and\b/g, '[Op.and]'],
  // Fix broken variable properties like where.$or or where$or
  [/where\.\$or/g, 'where[Op.or]'],
  [/where\$or/g, 'where[Op.or]'],
  [/return_date\$gte/g, 'return_date[Op.gte]'],
  [/return_date\$lte/g, 'return_date[Op.lte]'],
  [/time\$gte/g, 'time[Op.gte]'],
  [/time\$lte/g, 'time[Op.lte]'],
  // Fix double bracket anomalies if any got created
  [/\[\[Op\./g, '[Op.'],
  [/\]\]/g, ']'],
];

let totalFixed = 0;

for (const filePath of jsFiles) {
  if (filePath.includes('restoreOpOperators.js') || filePath.includes('fixOperators.js')) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const [pattern, replacement] of operatorReplacements) {
    content = content.replace(pattern, replacement);
  }

  // If Op is referenced in file, ensure Op is imported
  if (content.includes('Op.') && !content.includes('Op') && !content.includes('sequelize')) {
    content = `const { Op } = require('sequelize');\n` + content;
  } else if (content.includes('Op.') && !content.includes('Op')) {
    content = `const { Op } = require('sequelize');\n` + content;
  } else if (content.includes('Op.') && content.includes('require(') && !/\bOp\b/.test(content.split('\n').slice(0, 10).join('\n'))) {
    content = `const { Op } = require('sequelize');\n` + content;
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Fixed Operators] ${path.relative(serverDir, filePath)}`);
    totalFixed++;
  }
}

console.log(`Done restoring operators in ${totalFixed} files.`);
