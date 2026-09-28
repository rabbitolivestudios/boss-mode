import { describe, expect, test } from 'vitest';
import { webcrypto } from 'node:crypto';
import { authorizePassword, passwordLogin } from '../worker/password';

const ORIGIN = 'https://bossmode.example';

function login(password: string): Request {
  return new Request(`${ORIGIN}/analytics/login`, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password }).toString(),
  });
}

async function signIn(env: Record<string, string>, password: string): Promise<{ status: number; cookie: string | null }> {
  const r = await passwordLogin(login(password), env);
  return { status: r.status, cookie: r.headers.get('Set-Cookie')?.split(';')[0] ?? null };
}

const withCookie = (cookie: string) => new Request(`${ORIGIN}/analytics`, { headers: { Cookie: cookie } });

describe('plain password secret (set in the Cloudflare dashboard)', () => {
  const env = { ANALYTICS_PASSWORD: 'dragon-hoard-77' };

  test('the right password signs in, and the session cookie is accepted', async () => {
    const r = await signIn(env, 'dragon-hoard-77');
    expect(r.status).toBe(303);
    expect(r.cookie).toMatch(/^__Secure-bossmode_admin=/);
    expect(await authorizePassword(withCookie(r.cookie as string), env)).toBe(true);
  });

  test('a wrong password is refused and gets no cookie', async () => {
    const r = await signIn(env, 'dragon-hoard-78');
    expect(r.status).toBe(401);
    expect(r.cookie).toBeNull();
  });

  test('changing the password signs out existing sessions', async () => {
    const r = await signIn(env, 'dragon-hoard-77');
    expect(await authorizePassword(withCookie(r.cookie as string), { ANALYTICS_PASSWORD: 'new-password-1' })).toBe(false);
  });

  test('with no password configured, nobody can sign in', async () => {
    expect((await signIn({}, 'anything-at-all')).status).toBe(503);
    expect(await authorizePassword(withCookie('__Secure-bossmode_admin=x.y'), {})).toBe(false);
  });
});

describe('stored verifier (set by npm run set-password)', async () => {
  const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('castle-keeper-9'), 'PBKDF2', false, ['deriveBits']);
  const hash = new Uint8Array(await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, material, 256));
  const env = { ANALYTICS_PASSWORD_VERIFIER: `${b64u(salt)}.${b64u(hash)}`, ANALYTICS_SESSION_SECRET: b64u(webcrypto.getRandomValues(new Uint8Array(32))) };

  test('still works, and still refuses a wrong password', async () => {
    const ok = await signIn(env, 'castle-keeper-9');
    expect(ok.status).toBe(303);
    expect(await authorizePassword(withCookie(ok.cookie as string), env)).toBe(true);
    expect((await signIn(env, 'castle-keeper-8')).status).toBe(401);
  });
});
