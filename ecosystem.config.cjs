// Konfigurasi pm2 untuk menyajikan hasil build (folder dist/) sebagai SPA.
// Server Node juga menyediakan endpoint /api/chat agar OPENAI_API_KEY tetap
// berada di server, bukan di bundle browser.
//
// Pakai:
//   npm run build
//   pm2 start ecosystem.config.cjs
//
// nginx tinggal reverse-proxy ke PORT di bawah
// (proxy_pass http://localhost:4781), tanpa aturan rewrite khusus.
//
// File berekstensi .cjs karena package.json memakai "type": "module".
module.exports = {
  apps: [
    {
      name: 'allinone',
      script: 'server/index.js',
      interpreter: 'node',
      env: {
        PORT: 4781,
        STATIC_DIR: 'dist',
        OPENAI_MODEL: 'gpt-5.5',
      },
    },
  ],
};
