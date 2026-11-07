import 'server-only';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { supabase as cloudDatabase } from './supabase';

export const usingLocalDatabase =
  process.env.VST_DATABASE_MODE === 'sqlite' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project.supabase.co") ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY.includes("dummy");
let connection: any;
let encryptionKey: Buffer;

function db() {
  if (connection) return connection;
  const directory = process.env.VERCEL ? path.join('/tmp', '.local-data') : path.join(process.cwd(), '.local-data');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { chmodSync(directory, 0o700); } catch {}
  const keyPath = path.join(directory, 'database.key');
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: 'wx' });
  encryptionKey = readFileSync(keyPath);
  const nativeRequire = createRequire(path.join(process.cwd(), 'package.json'));
  const { DatabaseSync } = nativeRequire('node:sqlite');
  const file = path.join(directory, 'vst.sqlite');
  connection = new DatabaseSync(file);
  try { chmodSync(file, 0o600); } catch {}
  connection.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(collection,id));');
  return connection;
}
function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
function unseal(value: string) {
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, bytes.subarray(0,12));
  decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
}
class LocalQuery {
  filters: Array<(row: any) => boolean> = [];
  one = false;
  constructor(private collection: string) {}
  eq(key: string, value: unknown) { this.filters.push(row => row[key] === value); return this; }
  neq(key: string, value: unknown) { this.filters.push(row => row[key] !== value); return this; }
  in(key: string, values: unknown[]) { this.filters.push(row => Array.isArray(values) && values.includes(row[key])); return this; }
  order(_key?: string, _opts?: any) { return this; }
  limit(_count?: number) { return this; }
  maybeSingle() { this.one = true; return this; }
  single() { return this.maybeSingle(); }
  then(resolve: any, reject: any) {
    try {
      const rows = db().prepare('SELECT payload FROM records WHERE collection=?').all(this.collection)
        .map((row: any) => unseal(row.payload)).filter((row: any) => this.filters.every(filter => filter(row)));
      return Promise.resolve({data: this.one ? rows[0] || null : rows, error: null}).then(resolve,reject);
    } catch (error) { return Promise.reject(error).then(resolve,reject); }
  }
}
const localDatabase = {
  from(collection: string) {
    return {
      select(_columns?: string) { return new LocalQuery(collection); },
      upsert(values: any, _options?: unknown) {
        let insertedRows: any[] = [];
        try {
          const database = db();
          const rows = Array.isArray(values) ? values : [values];
          database.exec('BEGIN IMMEDIATE');
          try {
            for (const row of rows) {
              if (!row.id) throw new Error('Local records require an id');
              const prior = database.prepare('SELECT payload FROM records WHERE collection=? AND id=?').get(collection,String(row.id));
              const merged = {...(prior ? unseal(prior.payload) : {}), ...row};
              database.prepare('INSERT INTO records(collection,id,payload) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET payload=excluded.payload')
                .run(collection,String(row.id),seal(merged));
              insertedRows.push(merged);
            }
            database.exec('COMMIT');
          } catch(error) { database.exec('ROLLBACK'); throw error; }
        } catch(error) {
          return {
            select: () => ({
              single: () => Promise.resolve({ data: null, error }),
              maybeSingle: () => Promise.resolve({ data: null, error }),
              then(resolve: any, reject: any) { return Promise.reject(error).then(resolve, reject); }
            }),
            then(resolve: any, reject: any) {
              return Promise.reject(error).then(resolve, reject);
            }
          };
        }

        const outData = Array.isArray(values) ? insertedRows : (insertedRows[0] || null);
        return {
          data: outData,
          error: null,
          select() {
            return {
              single: () => Promise.resolve({ data: insertedRows[0] || null, error: null }),
              maybeSingle: () => Promise.resolve({ data: insertedRows[0] || null, error: null }),
              then(resolve: any, reject: any) {
                return Promise.resolve({ data: outData, error: null }).then(resolve, reject);
              }
            };
          },
          then(resolve: any, reject: any) {
            return Promise.resolve({ data: outData, error: null }).then(resolve, reject);
          }
        };
      },
    };
  },
  storage: cloudDatabase.storage,
};
export const database = (usingLocalDatabase ? localDatabase : cloudDatabase) as typeof cloudDatabase;
