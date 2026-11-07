import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
for (const file of ['.env.local','node_modules/next/dist/bin/next','certificates/localhost.pem','certificates/localhost-key.pem']) {
  if (!existsSync(file)) { console.error(`Missing ${file}. Run npm run setup:local first.`); process.exit(1); }
}
if (existsSync('.env.local')) {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}
console.log('Open https://localhost:3443 in your browser. Keep this terminal open. Ctrl+C stops the app.');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3443','--experimental-https','--experimental-https-key','certificates/localhost-key.pem','--experimental-https-cert','certificates/localhost.pem'], {stdio:'inherit', env: process.env});
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
