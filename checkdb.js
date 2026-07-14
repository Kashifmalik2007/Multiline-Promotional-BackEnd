const { connectionString, createClient } = require('./db');

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const client = createClient();

client.connect()
  .then(() => client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `))
  .then((result) => {
    console.log('PG OK');
    console.log('Tables:', result.rows.map((row) => row.table_name).join(', ') || '(none)');
    return client.end();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
