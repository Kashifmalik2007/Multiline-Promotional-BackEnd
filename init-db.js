const path = require('path');
const fs = require('fs');
const { connectionString, createClient } = require('./db');

const sqlPath = path.resolve(__dirname, 'setup-database.sql');

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = createClient();

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log('Database initialized.');
  })
  .catch((err) => {
    console.error('Database initialization failed:', err.message || err);
    process.exit(1);
  })
  .finally(() => client.end());
