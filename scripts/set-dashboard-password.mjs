// Sets the /analytics password on Cloudflare without it touching a file, the repo or shell history.
// It asks for the password, turns it into a PBKDF2 verifier (what the worker checks against), makes a
// fresh random session key, and hands both to `wrangler secret put` on stdin.
// Usage: npm run set-password   (after `npx wrangler login`)
import { spawnSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const b64u = (bytes) => Buffer.from(bytes).toString('base64url');

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stdout.write(s); };
    rl.question(prompt, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const password = await ask('New dashboard password: ');
if (password.length < 10) { console.error('Use at least 10 characters.'); process.exit(1); }
if ((await ask('Type it again: ')) !== password) { console.error('The two passwords differ.'); process.exit(1); }

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
const secrets = {
  ANALYTICS_PASSWORD_VERIFIER: `${b64u(salt)}.${b64u(hash)}`,
  // A new session key signs everyone out, so a changed password takes effect at once.
  ANALYTICS_SESSION_SECRET: b64u(crypto.getRandomValues(new Uint8Array(32))),
};
for (const [name, value] of Object.entries(secrets)) {
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', name], { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error(`Could not set ${name}.`); process.exit(1); }
}
console.log('Dashboard password set. Open /analytics to sign in.');
