const path = require('path');
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 1. ADMIN LOGIN DIRECT HANDLER (Absolute path mapping with fallback reporting)
app.get('/admin/login', (req, res) => {
  const loginPath = path.resolve(__dirname, 'public', 'admin', 'login.html');
  res.sendFile(loginPath, (err) => {
    if (err) {
      console.error("[Admin Error] Login file not found at:", loginPath);
      res.status(500).send(`
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid red; border-radius: 5px; max-width: 600px; margin: 50px auto;">
          <h2 style="color: red;">Admin Login File Missing</h2>
          <p>The backend could not find the file at this location:</p>
          <code style="background: #f4f4f4; padding: 5px 10px; display: block; word-break: break-all;">${loginPath}</code>
          <p style="margin-top: 15px;"><b>Solution:</b> Please verify that inside your GitHub repository <code>Multiline-Promotional-BackEnd</code>, you have created a folder named <b>public</b>, inside it a folder named <b>admin</b>, and uploaded <b>login.html</b> there.</p>
        </div>
      `);
    }
  });
});

// 2. ADMIN DASHBOARD DIRECT HANDLER
app.get('/admin/dashboard', (req, res) => {
  const dashboardPath = path.resolve(__dirname, 'public', 'admin', 'dashboard.html');
  res.sendFile(dashboardPath, (err) => {
    if (err) {
      console.error("[Admin Error] Dashboard file not found at:", dashboardPath);
      res.status(500).send(`
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid red; border-radius: 5px; max-width: 600px; margin: 50px auto;">
          <h2 style="color: red;">Admin Dashboard File Missing</h2>
          <p>The backend could not find the file at this location:</p>
          <code style="background: #f4f4f4; padding: 5px 10px; display: block; word-break: break-all;">${dashboardPath}</code>
        </div>
      `);
    }
  });
});

// Admin panel custom backend routes loader
adminRouter(app);

// Global fallback handler for index and other assets
app.use((req, res) => {
  // Agar koi galat api request ho to 404 do
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found.' });
  }
  // Baki saari requests par index.html default load ہوگی
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
