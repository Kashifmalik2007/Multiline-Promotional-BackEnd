const fs = require('fs');
const s = fs.readFileSync('public/assets/index-C_Ac32e1.js', 'utf8');
const j = s.indexOf('children:"Login"');
console.log(s.substring(j - 350, j + 50));
