const fs = require('fs');
const bundlePath = 'public/assets/index-C_Ac32e1.js';
let s = fs.readFileSync(bundlePath, 'utf8');

s = s.replace(
  'window.location.replace("/admin/login")',
  'window.location.replace("/admin/signup")'
);

const loginNavOld = '):c.jsx(Et,{href:"/admin",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})';
const loginNavNew = '):c.jsx(Et,{href:"/admin/signup",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})';

if (s.includes(loginNavOld)) {
  s = s.replace(loginNavOld, loginNavNew);
  console.log('Updated navbar login link');
} else if (s.includes(loginNavNew)) {
  console.log('Navbar login link already updated');
} else {
  console.log('Navbar login link pattern not found');
}

fs.writeFileSync(bundlePath, s);
console.log('signup redirect:', s.includes('window.location.replace("/admin/signup")'));
