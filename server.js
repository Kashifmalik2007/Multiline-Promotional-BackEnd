const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const MemoryStore = require('express-session').MemoryStore;
const { connectionString, createPool } = require('./db');
const adminRouter = require('./admin-router');

const app = express();
const port = process.env.PORT || 3000;

if (!connectionString) {
  console.error('Database Failed: DATABASE_URL is missing');
} else {
  console.log('Database URL configured');
}

const pool = createPool();

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(session({
  name: 'sid',
  store: process.env.NODE_ENV === 'production' && connectionString
    ? new pgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60
      })
    : new MemoryStore(),
  secret: process.env.SESSION_SECRET || 'multiline-promotional-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// ==========================================
// 📂 PRIORITY 1: IMAGES & STATIC ASSETS SERVING
// ==========================================
// Taake images bina fallback block ke direct load ho sakein
app.use('/attached_assets', express.static(path.join(__dirname, 'public', 'attached_assets')));
app.use('/attached_assets', express.static(path.join(__dirname, 'Public', 'attached_assets')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'attached_assets')));
app.use('/assets', express.static(path.join(__dirname, 'Public', 'attached_assets')));

// Baki normal assets (JS, CSS) ke liye static directories
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Public')));

// Root level 'admin' folder ko static serve karna (css/js files load karne ke liye)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ==========================================
// 🔑 PRIORITY 2: ADMIN PANEL HANDLERS
// ==========================================
app.get('/admin/login', (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, 'admin', 'login.html'), // Root level
    path.resolve(__dirname, 'public', 'admin', 'login.html'),
    path.resolve(__dirname, 'Public', 'admin', 'login.html'),
    path.resolve(__dirname, 'public', 'login.html')
  ];

  let fileSent = false;
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
        fileSent = true;
        break;
      }
    } catch (e) {}
  }

  if (!fileSent) {
    res.status(500).send("Admin login.html file missing on server.");
  }
});

app.get('/admin/dashboard', (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, 'admin', 'dashboard.html'), // Root level
    path.resolve(__dirname, 'public', 'admin', 'dashboard.html'),
    path.resolve(__dirname, 'Public', 'admin', 'dashboard.html'),
    path.resolve(__dirname, 'public', 'dashboard.html')
  ];

  let fileSent = false;
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
        fileSent = true;
        break;
      }
    } catch (e) {}
  }

  if (!fileSent) {
    res.status(500).send("Admin dashboard.html file missing on server.");
  }
});

// Admin panel backend API routes loader
adminRouter(app);

// ==========================================
// 🌐 PRIORITY 3: GLOBAL FALLBACK (For React/SPA)
// ==========================================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found.' });
  }

  // Toote hue images ya assets ko ghalti se html serve hone se rokne ke liye
  if (req.path.match(/\.(png|jpe?g|gif|svg|ico|css|js)$/)) {
    return res.status(404).send("File not found");
  }
  
  const indexPaths = [
    path.resolve(__dirname, 'public', 'index.html'),
    path.resolve(__dirname, 'Public', 'index.html')
  ];
  
  for (const indexPath of indexPaths) {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  return res.status(404).send("Frontend build index.html not found.");
});

async function start() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database Connected');
  } catch (error) {
    console.error('Database Failed:', error.message);
  }

  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.log('SendGrid Ready');
  } else {
    console.warn('SendGrid Ready: no valid API key provided');
  }

  app.listen(port, () => {
    console.log(`Server Started on port ${port}`);
  });
}

start();
