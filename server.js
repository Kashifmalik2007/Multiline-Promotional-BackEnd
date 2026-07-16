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

// 1. ADMIN LOGIN DIRECT HANDLER (Server-level bypass)
app.get('/admin/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// 2. ADMIN DASHBOARD DIRECT HANDLER
app.get('/admin/dashboard', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Admin panel custom backend routes loader
adminRouter(app);

// Global fallback handler for index and other assets
app.use((req, res) => {
  // Agar koi galat api request ho to 404 do
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found.' });
  }
  // Baki saari requests par index.html default load hogi
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
