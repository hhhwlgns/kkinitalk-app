const fs = require('fs');
const src = process.argv[2];
const dest = process.argv[3];
const raw = fs.readFileSync(src, 'utf8');
const data = JSON.parse(raw);
fs.writeFileSync(dest, data.content, 'utf8');
console.log('wrote', data.content.length, 'chars');
