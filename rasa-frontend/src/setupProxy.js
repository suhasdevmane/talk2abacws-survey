// Proxy requests from the React dev server to backend services
// This keeps everything same-origin, so only ONE ngrok tunnel (frontend) is needed.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy /api requests to the API container
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://abacws-api:5000',
      changeOrigin: true,
      ws: true,
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
      },
    })
  );

  // Ensure /visualiser (no trailing slash) redirects to /visualiser/ so relative assets resolve
  app.use('/visualiser', (req, res, next) => {
    if (req.originalUrl === '/visualiser') {
      res.redirect(307, '/visualiser/');
      return;
    }
    next();
  });

  // Proxy /visualiser requests to the Visualiser container
  app.use(
    '/visualiser',
    createProxyMiddleware({
      target: 'http://abacws-visualiser:80',
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/visualiser': '/',
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
      },
    })
  );
};
