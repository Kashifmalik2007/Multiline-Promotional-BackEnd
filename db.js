const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool, Client } = require('pg');

function normalizeDatabaseUrl(url) {
  if (!url) return url;
  // SSL is configured explicitly on Pool/Client; strip sslmode from the URL
  // so pg does not treat require as verify-full certificate validation.
  return url.replace(/([?&])sslmode=[^&]*(&|$)/, (_, prefix, suffix) => {
    if (prefix === '?' && suffix) return '?';
    if (prefix === '?' && !suffix) return '';
    if (prefix === '&' && suffix) return '&';
    return '';
  }).replace(/[?&]$/, '');
}

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);

const ssl = {
  rejectUnauthorized: false
};

function createPool() {
  return new Pool({
    connectionString,
    ssl
  });
}

function createClient() {
  return new Client({
    connectionString,
    ssl
  });
}

module.exports = {
  normalizeDatabaseUrl,
  connectionString,
  ssl,
  createPool,
  createClient,
  Pool,
  Client
};
