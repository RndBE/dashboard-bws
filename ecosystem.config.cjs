// Konfigurasi pm2 untuk menyajikan hasil build (folder dist/) sebagai SPA.
//
// Pakai:
//   npm run build
//   pm2 start ecosystem.config.cjs
//
// PM2_SERVE_SPA='true' membuat semua request yang bukan file fisik diarahkan
// ke index.html — wajib agar clean URL (mis. /bendungan/bend-cigaru) tidak 404
// saat di-refresh atau dibuka langsung. nginx tinggal reverse-proxy ke PORT
// di bawah (proxy_pass http://localhost:8080), tanpa aturan rewrite khusus.
//
// File berekstensi .cjs karena package.json memakai "type": "module".
module.exports = {
  apps: [
    {
      name: 'allinone',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: 'dist',
        PM2_SERVE_PORT: 8080,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
    },
  ],
};
