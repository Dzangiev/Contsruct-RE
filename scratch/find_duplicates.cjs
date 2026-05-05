
const fs = require('fs');
const content = fs.readFileSync('c:/My Projec/CRE gpt oss 120b/src/i18n/types.ts', 'utf8');
const lines = content.split('\n');
const keys = [];
lines.forEach(line => {
  const match = line.match(/^\s*([A-Z0-9_]+):/);
  if (match) {
    keys.push(match[1]);
  }
});

const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
console.log('Duplicates in types.ts:', Array.from(new Set(duplicates)));

const ruContent = fs.readFileSync('c:/My Projec/CRE gpt oss 120b/src/i18n/ru.ts', 'utf8');
const ruLines = ruContent.split('\n');
const ruKeys = [];
ruLines.forEach(line => {
  const match = line.match(/^\s*([A-Z0-9_]+):/);
  if (match) {
    ruKeys.push(match[1]);
  }
});
const ruDuplicates = ruKeys.filter((item, index) => ruKeys.indexOf(item) !== index);
console.log('Duplicates in ru.ts:', Array.from(new Set(ruDuplicates)));

const enContent = fs.readFileSync('c:/My Projec/CRE gpt oss 120b/src/i18n/en.ts', 'utf8');
const enLines = enContent.split('\n');
const enKeys = [];
enLines.forEach(line => {
  const match = line.match(/^\s*([A-Z0-9_]+):/);
  if (match) {
    enKeys.push(match[1]);
  }
});
const enDuplicates = enKeys.filter((item, index) => enKeys.indexOf(item) !== index);
console.log('Duplicates in en.ts:', Array.from(new Set(enDuplicates)));
