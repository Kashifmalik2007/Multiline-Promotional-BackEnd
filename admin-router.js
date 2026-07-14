const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const fs = require('fs');
const bcrypt = require('bcrypt');
const { createPool } = require('./db');

const pool = createPool();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// --- Helpers ---
function verifyAdminCredentials(username, password) {
  return username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
}

function isAuthenticated(req) {
  return !!req.session?.adminAuthenticated;
}

function requireAdmin(req, res, next) {
  if (isAuthenticated(req)) return next();
  if (req.headers['x-requested-with'] || req.path.startsWith('/api/')) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  return res.redirect('/admin/login');
}

// Serve an HTML file directly using fs.readFileSync + res.send to bypass catch-all middleware
function serveAdminHTML(filename, res) {
  const filePath = path.join(__dirname, 'public', 'admin', filename);
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (e) {
    console.error('[Admin Panel] Failed to read HTML file:', filePath, e.message);
    return res.status(500).send('<h1>Admin panel file missing. Please check server setup.</h1>');
  }
}

// Load dynamic settings
function getSettings() {
  const settingsPath = path.join(__dirname, 'settings.json');
  let settings = { whatsapp: '923004303949', email: 'kashif71malik@gmail.com' };
  try {
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (e) {
    console.error('[Admin Panel] Error reading settings.json:', e.message);
  }
  return settings;
}

// Monkey-patch @sendgrid/mail to redirect email to configured address
try {
  const sgMail = require('@sendgrid/mail');
  if (sgMail && sgMail.send) {
    const originalSend = sgMail.send.bind(sgMail);
    sgMail.send = function (data) {
      try {
        const settings = getSettings();
        if (settings.email) {
          const updateTo = (msg) => {
            if (msg && msg.to === 'kashif71malik@gmail.com') {
              msg.to = settings.email;
              console.log('[Admin Panel] Redirected email to:', settings.email);
            }
          };
          if (Array.isArray(data)) data.forEach(updateTo);
          else updateTo(data);
        }
      } catch (e) {
        console.error('[Admin Panel] SendGrid patch error:', e.message);
      }
      return originalSend(data);
    };
    console.log('[Admin Panel] SendGrid mail recipient monkey-patched successfully.');
  }
} catch (e) {
  console.log('[Admin Panel] SendGrid patch skipped:', e.message);
}

// ============================================================
// MAIN EXPORT — registers all routes on the Express app
// ============================================================
module.exports = function (app) {

  // ── HIGHEST PRIORITY: intercept ALL /admin* routes ───────
  // express.json() is already globally registered on mn, so req.body
  // is already parsed for all routes. No duplicate parser needed here.

  // ── PUBLIC PRODUCTS API (storefront: catalog, featured, product details) ──
  // These are intentionally NOT behind requireAdmin — the public website
  // (Product Catalog, Homepage Featured Collection, Product Details page)
  // needs to read products without an admin session.

  // GET /api/products → full catalog list, used by the Catalog page.
  // Supports optional ?category=Xyz and ?q=searchTerm for server-side filtering,
  // but the frontend can also filter client-side using the full list.
  app.get('/api/products', async (req, res) => {
    try {
      const { category, q } = req.query || {};
      const clauses = [];
      const params = [];

      if (category && category !== 'ALL') {
        params.push(category);
        clauses.push(`category = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        clauses.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT id, name, description, sku, price, moq, category,
                image_url AS "imageUrl", is_featured AS "isFeatured",
                colors, specifications, created_at AS "createdAt"
         FROM products ${where}
         ORDER BY id DESC`,
        params
      );
      return res.json(result.rows);
    } catch (err) {
      console.error('[Public] Error fetching products:', err.message);
      return res.status(500).json({ message: 'Failed to fetch products.' });
    }
  });

  // GET /api/products/featured → used by the Homepage Featured Collection.
  app.get('/api/products/featured', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, sku, price, moq, category,
                image_url AS "imageUrl", is_featured AS "isFeatured",
                colors, specifications, created_at AS "createdAt"
         FROM products WHERE is_featured = true ORDER BY id DESC`
      );
      return res.json(result.rows);
    } catch (err) {
      console.error('[Public] Error fetching featured products:', err.message);
      return res.status(500).json({ message: 'Failed to fetch featured products.' });
    }
  });

  // GET /api/products/:id → used by the Product Details page.
  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid product id.' });

      const result = await pool.query(
        `SELECT id, name, description, sku, price, moq, category,
                image_url AS "imageUrl", is_featured AS "isFeatured",
                colors, specifications, created_at AS "createdAt"
         FROM products WHERE id = $1`,
        [id]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found.' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('[Public] Error fetching product:', err.message);
      return res.status(500).json({ message: 'Failed to fetch product.' });
    }
  });

  // ── LOGIN PAGE ────────────────────────────────────────────
  // GET /admin  → redirect to admin login page
  app.get('/admin', (req, res) => {
    if (isAuthenticated(req)) return res.redirect('/admin/dashboard');
    return res.redirect('/admin/login');
  });

  // GET /admin/login → serve login.html directly
  app.get('/admin/login', (req, res) => {
    if (isAuthenticated(req)) return res.redirect('/admin/dashboard');
    return serveAdminHTML('login.html', res);
  });

  // GET /admin/signup → serve admin login/sign-up form
  app.get('/admin/signup', (req, res) => {
    if (isAuthenticated(req)) return res.redirect('/admin/dashboard');
    return serveAdminHTML('login.html', res);
  });

  // POST /admin/login → authenticate
  app.post('/admin/login', (req, res) => {
    const { username, password, email } = req.body || {};
    const identity = username || email;
    console.log('[Admin] Login request received for:', identity);
    console.log('[Admin] Before creating session:', req.session);
    if (verifyAdminCredentials(identity, password)) {
      req.session.adminAuthenticated = true;
      req.session.adminUser = identity;
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7;
      req.session.cookie.sameSite = 'lax';
      req.session.cookie.httpOnly = true;
      req.session.cookie.secure = process.env.NODE_ENV === 'production';
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Admin] Session regenerate failed:', err.message);
          return res.status(500).json({ message: 'Could not start session.' });
        }
        req.session.adminAuthenticated = true;
        req.session.adminUser = identity;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Admin] Session save failed:', saveErr.message);
            return res.status(500).json({ message: 'Could not start session.' });
          }
          console.log('[Admin] After login save callback:', req.session);
          return res.json({ success: true, message: 'Logged in successfully.' });
        });
      });
      return undefined;
    }
    return res.status(401).json({ message: 'Invalid username or password.' });
  });

  // GET /api/auth/user → return authenticated user info for React frontend
  app.get('/api/auth/user', (req, res) => {
    console.log('[Admin] /api/auth/user request session:', req.session);
    if (isAuthenticated(req)) {
      return res.json({
        id: 'admin',
        username: ADMIN_USERNAME,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User'
      });
    }
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  });

  // GET /api/logout → logout and redirect
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error('[Admin] Logout failed:', err.message);
      res.redirect('/admin/login');
    });
  });

  // ── LOGOUT ───────────────────────────────────────────────
  app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error('[Admin] Logout failed:', err.message);
      res.redirect('/admin/login');
    });
  });

  // ── DASHBOARD PAGE ────────────────────────────────────────
  app.get('/admin/dashboard', requireAdmin, (req, res) => {
    return serveAdminHTML('dashboard.html', res);
  });

  // ── /api/admin routes use global express.json() already ───

  // ── PRODUCTS API ─────────────────────────────────────────

  // List all products
  app.get('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, sku, price, moq, category,
                image_url AS "imageUrl", is_featured AS "isFeatured",
                colors, specifications, created_at AS "createdAt"
         FROM products ORDER BY id DESC`
      );
      return res.json(result.rows);
    } catch (err) {
      console.error('[Admin] Error fetching products:', err.message);
      return res.status(500).json({ message: 'Failed to fetch products.' });
    }
  });

  // Create product
  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const {
        name, description, sku, price, moq, category,
        imageUrl, isFeatured, colors, specifications
      } = req.body || {};

      const result = await pool.query(
        `INSERT INTO products (name, description, sku, price, moq, category, image_url, is_featured, colors, specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, name, description, sku, price, moq, category,
                   image_url AS "imageUrl", is_featured AS "isFeatured", colors, specifications`,
        [
          name || 'New Product',
          description || '',
          sku || `PROD-${Date.now()}`,
          price || '0.00',
          parseInt(moq, 10) || 1,
          category || 'Uncategorized',
          imageUrl || '/assets/logo.png',
          !!isFeatured,
          Array.isArray(colors) ? colors : ['Custom'],
          specifications || {}
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Error creating product:', err.message);
      return res.status(500).json({ message: 'Failed to create product.' });
    }
  });

  // Update product
  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const {
        name, description, sku, price, moq, category,
        imageUrl, isFeatured, colors, specifications
      } = req.body || {};

      const result = await pool.query(
        `UPDATE products
         SET name=$1, description=$2, sku=$3, price=$4, moq=$5,
             category=$6, image_url=$7, is_featured=$8, colors=$9, specifications=$10
         WHERE id=$11
         RETURNING id, name, description, sku, price, moq, category,
                   image_url AS "imageUrl", is_featured AS "isFeatured", colors, specifications`,
        [
          name || 'Updated Product',
          description || '',
          sku || `PROD-${id}`,
          price || '0.00',
          parseInt(moq, 10) || 1,
          category || 'Uncategorized',
          imageUrl || '/assets/logo.png',
          !!isFeatured,
          Array.isArray(colors) ? colors : ['Custom'],
          specifications || {},
          id
        ]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found.' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('[Admin] Error updating product:', err.message);
      return res.status(500).json({ message: 'Failed to update product.' });
    }
  });

  // Delete product
  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await pool.query('DELETE FROM products WHERE id=$1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found.' });
      return res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (err) {
      console.error('[Admin] Error deleting product:', err.message);
      return res.status(500).json({ message: 'Failed to delete product.' });
    }
  });

  // ── IMAGE UPLOAD (Base64) ─────────────────────────────────
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    try {
      const { filename, fileData } = req.body || {};
      if (!filename || !fileData) {
        return res.status(400).json({ message: 'Missing filename or fileData.' });
      }
      const matches = fileData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ message: 'Invalid image data format.' });

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const targetDir = path.join(__dirname, 'public', 'attached_assets');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const safeName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uniqueName = `${Date.now()}_${safeName}.${ext}`;
      fs.writeFileSync(path.join(targetDir, uniqueName), buffer);

      console.log('[Admin] Uploaded image:', uniqueName);
      return res.json({ url: `/attached_assets/${uniqueName}` });
    } catch (err) {
      console.error('[Admin] Upload error:', err.message);
      return res.status(500).json({ message: 'Failed to upload image.' });
    }
  });

  // ── SETTINGS API ──────────────────────────────────────────
  app.get('/api/admin/settings', requireAdmin, (req, res) => {
    return res.json(getSettings());
  });

  app.post('/api/admin/settings', requireAdmin, (req, res) => {
    try {
      const { whatsapp, email } = req.body || {};
      const settingsPath = path.join(__dirname, 'settings.json');
      const settings = { whatsapp: whatsapp || '923004303949', email: email || 'kashif71malik@gmail.com' };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('[Admin] Settings updated:', settings);
      return res.json({ message: 'Settings saved successfully.', settings });
    } catch (err) {
      console.error('[Admin] Settings save error:', err.message);
      return res.status(500).json({ message: 'Failed to save settings.' });
    }
  });

  console.log('[Admin Panel] All routes registered successfully.');
};
