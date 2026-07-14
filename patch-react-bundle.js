const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'assets', 'index-C_Ac32e1.js');
let code = fs.readFileSync(file, 'utf8');

const patches = [
  {
    name: 'Unauthenticated Login Navbar Link',
    target: 'c.jsx(Et,{href:"/admin/login",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})',
    replacement: 'c.jsx("a",{href:"/admin/login",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})'
  },
  {
    name: 'Desktop Authenticated Dashboard Link',
    target: 'c.jsx(Et,{href:"/admin",children:c.jsx("span",{className:"hidden md:block text-xs font-semibold bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition",children:"Admin Dashboard"})})',
    replacement: 'c.jsx("a",{href:"/admin/dashboard",children:c.jsx("span",{className:"hidden md:block text-xs font-semibold bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition",children:"Admin Dashboard"})})'
  },
  {
    name: 'Mobile Authenticated Dashboard Link',
    target: 'c.jsx(Et,{href:"/admin",children:c.jsx("span",{className:"block text-secondary font-bold py-2",onClick:()=>a(!1),children:"Admin Dashboard"})})',
    replacement: 'c.jsx("a",{href:"/admin/dashboard",children:c.jsx("span",{className:"block text-secondary font-bold py-2",onClick:()=>a(!1),children:"Admin Dashboard"})})'
  }
];

patches.forEach(p => {
  if (!code.includes(p.target)) {
    console.error(`ERROR: Target not found for patch: "${p.name}"`);
    process.exit(1);
  }
  code = code.replace(p.target, p.replacement);
  console.log(`Successfully applied patch: "${p.name}"`);
});

fs.writeFileSync(file, code, 'utf8');
console.log('React bundle patched successfully.');
