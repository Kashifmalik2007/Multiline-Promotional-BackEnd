const fs = require('fs');
const s = fs.readFileSync('index.cjs', 'utf8');
['admin-router', 'process.env.PORT', '.listen('].forEach(p => {
  const i = s.lastIndexOf(p);
  console.log(p, i);
  if (i >= 0) console.log(s.slice(i, i + 250));
  console.log('---');
});
