const fs = require('fs');
const s = fs.readFileSync('index.cjs', 'utf8');
const idx = s.indexOf('{name:"Keychain"');
const end = s.indexOf('for(let r of e)', idx);
const chunk = s.slice(idx, end);
const names = [...chunk.matchAll(/name:"([^"]+)"/g)].map(m => m[1]);
const urls = [...chunk.matchAll(/imageUrl:"([^"]+)"/g)].map(m => m[1]);
console.log('SEED_COUNT', names.length);
names.forEach((n, i) => console.log(`${i+1}. ${n} -> ${urls[i]}`));
