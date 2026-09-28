// Prints the fingerprint for a new /analytics password, to paste into wrangler.jsonc as
// ANALYTICS_PASSWORD_VERIFIER. The password is only read from the prompt, never stored.
// Usage: node scripts/password-fingerprint.mjs
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => { if (s.includes('password')) process.stdout.write(s); };
rl.question('New dashboard password: ', (pw) => {
  rl.close();
  if (pw.length < 8) { console.error('\nUse at least 8 characters.'); process.exit(1); }
  const salt = randomBytes(16);
  // 100k rounds is the most PBKDF2 Cloudflare Workers will run.
  const hash = pbkdf2Sync(pw, salt, 100000, 32, 'sha256');
  console.log(`\n${salt.toString('base64url')}.${hash.toString('base64url')}`);
});
