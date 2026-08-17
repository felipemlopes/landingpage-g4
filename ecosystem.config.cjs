// Ecosystem config do PM2 para o frontend (Vite + React).
// Extensão .cjs necessária porque o package.json define "type": "module".
//
// Uso:
//   npm run build              (gera a pasta dist/ antes do primeiro start)
//   pm2 start ecosystem.config.cjs
//   pm2 restart landingpage-g4-frontend
//   pm2 logs landingpage-g4-frontend
module.exports = {
  apps: [
    {
      name: 'landingpage-g4-frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 4173',
      cwd: __dirname,
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
}
