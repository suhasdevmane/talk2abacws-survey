// Proxy /visualiser requests from the React dev server to the Visualiser container
// This keeps the iframe on the same origin (frontend), avoiding ngrok's browser warning page.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
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
        // Helpful header if we ever point to an ngrok URL instead of container DNS
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
      },
    })
  );
};
