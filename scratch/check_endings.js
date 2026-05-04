import fs from 'fs';
const content = fs.readFileSync('src/store/useEditorStore.ts', 'utf8');
console.log(JSON.stringify(content.slice(-20)));
