const fs = require('fs');
const bundlePath = 'public/assets/index-C_Ac32e1.js';
let s = fs.readFileSync(bundlePath, 'utf8');

const gatewayBlock = `if(!e)return c.jsx("div",{className:"min-h-screen flex items-center justify-center bg-slate-50",children:c.jsxs(Ss,{className:"w-full max-w-md shadow-xl",children:[c.jsxs(pf,{className:"text-center pb-2",children:[c.jsx("div",{className:"mx-auto w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mb-4",children:c.jsx(hC,{className:"w-6 h-6"})}),c.jsx(mf,{className:"text-2xl font-bold text-primary",children:"Admin Access"})]}),c.jsxs(Ns,{className:"space-y-4 pt-4",children:[c.jsx("p",{className:"text-center text-muted-foreground mb-4",children:"Please log in to access the administrative dashboard."}),c.jsx("a",{href:"/api/login",children:c.jsx(Ct,{className:"w-full bg-primary hover:bg-primary/90 text-lg py-6",children:"Log In with Replit"})}),c.jsx("div",{className:"text-center mt-4",children:c.jsx("a",{href:"/",className:"text-sm text-muted-foreground hover:text-primary underline",children:"Return to Website"})})]})]})});`;

const redirectBlock = `if(!e)return window.location.replace("/admin/signup"),null;`;

if (!s.includes(gatewayBlock)) {
  console.error('Gateway block not found');
  process.exit(1);
}

s = s.replace(gatewayBlock, redirectBlock);

// Navbar Login link: only the unauthenticated login link (not Admin Dashboard)
const loginNavOld = `):c.jsx(Et,{href:"/admin",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})`;
const loginNavNew = `):c.jsx(Et,{href:"/admin/signup",children:c.jsxs("div",{className:"hidden md:flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white cursor-pointer transition-colors",children:[c.jsx(kC,{className:"w-4 h-4"}),c.jsx("span",{children:"Login"})]})})`;

if (!s.includes(loginNavOld)) {
  console.error('Navbar login link not found');
  process.exit(1);
}

s = s.replace(loginNavOld, loginNavNew);

fs.writeFileSync(bundlePath, s);
console.log('Bundle patched successfully');
