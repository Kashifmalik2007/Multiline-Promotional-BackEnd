const fs = require('fs');
const s = fs.readFileSync('public/assets/index-C_Ac32e1.js', 'utf8');
const i = s.indexOf('window.location.replace');
console.log('redirect:', s.substring(i, i + 80));
const j = s.indexOf('children:"Login"');
console.log('nav:', s.substring(j - 200, j + 50));
