const app = require('./server');

const PORT = 5001;

async function test() {
  const server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);

    try {
      const health = await fetch(`http://127.0.0.1:${PORT}/api/health`).then(r => r.json());
      console.log('Health:', JSON.stringify(health));

      const reg = await fetch(`http://127.0.0.1:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@x.com', password: 'pw1234' }),
      }).then(r => r.json());
      console.log('Register token exists:', !!reg.token);

      const me = await fetch(`http://127.0.0.1:${PORT}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${reg.token}` },
      }).then(r => r.json());
      console.log('Me email:', me.email);

      const meals = await fetch(`http://127.0.0.1:${PORT}/api/meals/2025-06-07`, {
        headers: { 'Authorization': `Bearer ${reg.token}` },
      }).then(r => r.json());
      console.log('Meals breakfast count:', meals.meals?.breakfast?.length || 0);

      console.log('\nAll smoke tests passed ✅');
    } catch (err) {
      console.error('Smoke test failed:', err.message);
      process.exitCode = 1;
    } finally {
      // Allow fetch connections to close before shutting down the server
      // to avoid a Windows Node.js/libuv assertion error.
      setTimeout(() => {
        server.close(() => process.exit(process.exitCode || 0));
      }, 500);
    }
  });
}

test();
