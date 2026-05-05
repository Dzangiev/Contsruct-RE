
const fs = require('fs');

function findLines(filename, key) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  const found = [];
  lines.forEach((line, i) => {
    if (line.includes(key + ':')) {
      found.push(i + 1);
    }
  });
  return found;
}

const files = [
  'c:/My Projec/CRE gpt oss 120b/src/i18n/en.ts',
  'c:/My Projec/CRE gpt oss 120b/src/i18n/ru.ts'
];

files.forEach(file => {
  console.log(`File: ${file}`);
  ['EVERY_TICK', 'ON_START_OF_LAYOUT'].forEach(key => {
    console.log(`  ${key}: ${findLines(file, key).join(', ')}`);
  });
});
