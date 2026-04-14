const { Client } = require('pg');

const client = new Client({
  connectionString: "postgres://postgres:123qwe456@127.0.0.1:5432/medusa_polemarch",
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT token, title, type FROM api_key WHERE type = 'publishable';");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
