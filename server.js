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

// Static files serve karne ke liye index configuration
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Public')));

// ====== IMAGES & ASSETS FIX ======
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'Public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'Assets')));
app.use('/assets', express.static(path.join(__dirname, 'Public', 'Assets')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 🔍 SECRET ASSETS DEBUGGER (Yeh batayega ke folder mein kaunsi images hain)
app.get('/debug-assets', (req, res) => {
  const assetsPath = path.resolve(__dirname, 'public', 'assets');
  const publicPath = path.resolve(__dirname, 'public');
  
  let assetsFiles = [];
  let publicFiles = [];
  
  try {
    if (fs.existsSync(publicPath)) {
      publicFiles = fs.readdirSync(publicPath);
    }
    if (fs.existsSync(assetsPath)) {
      assetsFiles = fs.readdirSync(assetsPath);
    }
    res.json({
      message: "Assets Debugger is running!",
      public_folder_exists: fs.existsSync(publicPath),
      public_files: publicFiles,
      assets_folder_exists: fs.existsSync(assetsPath),
      assets_files: assetsFiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. ADMIN LOGIN BULLETPROOF HANDLER
app.get('/admin/login', (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, 'public', 'admin', 'login.html'),
    path.resolve(__dirname, 'Public', 'admin', 'login.html'),
    path.resolve(__dirname, 'public', 'Admin', 'login.html'),
    path.resolve(__dirname, 'Public', 'Admin', 'login.html'),
    path.resolve(__dirname, 'public', 'login.html'),
    path.resolve(__dirname, 'Public', 'login.html'),
    path.resolve(__dirname, 'admin', 'login.html'),
    path.resolve(__dirname, 'login.html')
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
    res.status(500).send(`
      <div style="font-family: sans-serif; padding: 25px; border: 2px solid red; border-radius: 8px; max-width: 650px; margin: 50px auto;">
        <h2 style="color: red; margin-top: 0;">Admin Login File Missing</h2>
        <p>The system tried searching, but couldn't find login.html</p>
      </div>
    `);
  }
});

// 2. ADMIN DASHBOARD BULLETPROOF HANDLER
app.get('/admin/dashboard', (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, 'public', 'admin', 'dashboard.html'),
    path.resolve(__dirname, 'Public', 'admin', 'dashboard.html'),
    path.resolve(__dirname, 'public', 'Admin', 'dashboard.html'),
    path.resolve(__dirname, 'Public', 'Admin', 'dashboard.html'),
    path.resolve(__dirname, 'public', 'dashboard.html'),
    path.resolve(__dirname, 'Public', 'dashboard.html'),
    path.resolve(__dirname, 'admin', 'dashboard.html'),
    path.resolve(__dirname, 'dashboard.html')
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
    res.status(500).send(`<h2>Admin Dashboard File Missing</h2>`);
  }
});

// Admin panel custom backend routes loader
adminRouter(app);

// Global fallback handler for index and other assets
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found.' });
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
