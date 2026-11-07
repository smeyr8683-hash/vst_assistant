import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { X509Certificate, createPrivateKey } from 'node:crypto';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
let failed = false;
function check(label, ok) { console.log(`${ok ? 'PASS' : 'MISSING/INVALID'}: ${label}`); if(!ok) failed = true; }
try { const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite'); const db = new DatabaseSync(':memory:'); db.close(); check('Node.js SQLite',true); } catch {check('Node.js SQLite',false);}
check('Dependencies installed', existsSync('node_modules/next/dist/bin/next'));
const env = {};
if(existsSync('.env.local')) for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)) { const match=line.match(/^([A-Z_]+)=(.*)$/); if(match)env[match[1]]=match[2].trim(); }
check('Local SQLite mode',env.VST_DATABASE_MODE==='sqlite');
for(const name of ['ENABLE_BOT_AUTOMATION','NEXT_PUBLIC_ENABLE_AUTO_SCANNER','ENABLE_FACEBOOK_WEBHOOK_SUBSCRIPTION']) check(`${name} is OFF`,env[name]==='false');
check('Your Meta App ID configured and matching', /^\d+$/.test(env.FB_APP_ID || '') && env.FB_APP_ID===env.NEXT_PUBLIC_FB_APP_ID);
check('Your Login Configuration ID configured', /^\d+$/.test(env.NEXT_PUBLIC_FB_CONFIG_ID || ''));
try {
 const cert=new X509Certificate(readFileSync('certificates/localhost.pem'));
 check('Certificate covers localhost and matches private key', !!cert.checkHost('localhost') && cert.checkPrivateKey(createPrivateKey(readFileSync('certificates/localhost-key.pem'))));
 check('Certificate has not expired', Date.parse(cert.validTo)>Date.now());
} catch {check('HTTPS certificates',false);}
console.log('This check never prints secrets. Certificate trust and Facebook permissions must also be verified in your browser.');
process.exitCode=failed?1:0;
