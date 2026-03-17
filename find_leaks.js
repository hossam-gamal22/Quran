const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'scan_report.json');
const d = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const files = d.allLeaks.filter(l => l.file.includes('app/(tabs)') || l.file.includes('components/ui'));

const groupByFile = {};
files.forEach(l => {
  if (!groupByFile[l.file]) groupByFile[l.file] = [];
  groupByFile[l.file].push(l);
});

Object.keys(groupByFile).forEach(f => {
  console.log('\n--- ' + f + ' ---');
  groupByFile[f].forEach(l => console.log('Line ' + l.line + ': ' + l.content.trim()));
});
