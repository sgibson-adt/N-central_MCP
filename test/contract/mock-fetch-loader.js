const originalFetch = global.fetch;
global.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return originalFetch(input, init);
  if (url.pathname === '/api/auth/authenticate' || url.pathname === '/api/auth/refresh') {
    return Response.json({ tokens: { access: { token: 'synthetic-access' }, refresh: { token: 'synthetic-refresh' } } });
  }
  return Response.json({ data: { method: init.method || 'GET', path: url.pathname } });
};
