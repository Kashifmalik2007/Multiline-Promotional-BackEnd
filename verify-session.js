const http = require('http');
let cookie = '';
function request(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {};
    if (cookie) headers.Cookie = cookie;
    const req = http.request({ hostname: '127.0.0.1', port: 3000, path, method, headers }, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        cookie = first.split(';')[0];
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
(async () => {
  const loginResp = await request('/admin/login', 'POST', { username: 'admin', password: 'admin123' });
  console.log('LOGIN', loginResp.statusCode, loginResp.data);
  const authResp = await request('/api/auth/user', 'GET');
  console.log('AUTH', authResp.statusCode, authResp.data);
})();
