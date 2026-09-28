/** Dashboard password verification and six-hour signed sessions; no credentials live in source. Ported from Footy Draft. */
export interface PasswordConfiguration {
  ANALYTICS_PASSWORD_VERIFIER?: string;
  ANALYTICS_SESSION_SECRET?: string;
  /**
   * The simpler setup for a site deployed from GitHub: the password itself as an encrypted Worker
   * secret, typed into the Cloudflare dashboard. Used only when no verifier is configured.
   */
  ANALYTICS_PASSWORD?: string;
}
const COOKIE = "__Secure-bossmode_admin";
const SESSION_SECONDS = 6 * 60 * 60;
const encoder = new TextEncoder();
const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  // Native form POSTs under no-referrer send Origin: null and fail our CSRF check.
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};
function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function decode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_encoding");
  const bytes = Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  if (encode(bytes) !== value) throw new Error("invalid_encoding");
  return bytes;
}
interface Config {
  /** Bound into every session, so changing the password signs everyone out. */
  verifier: string;
  key: Uint8Array;
  check(password: string): Promise<boolean>;
}
async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}
function same(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
async function configuration(env: PasswordConfiguration): Promise<Config> {
  const verifier = env.ANALYTICS_PASSWORD_VERIFIER;
  if (!verifier) {
    const plain = env.ANALYTICS_PASSWORD;
    if (!plain || plain.length < 8 || plain.length > 200) throw new Error("unconfigured");
    // Derived with fixed labels so they change with the password and never reveal it.
    const target = await sha256(`boss-mode analytics check v1|${plain}`);
    return {
      verifier: `p.${encode(await sha256(`boss-mode analytics binding v1|${plain}`))}`,
      key: await sha256(`boss-mode analytics session v1|${plain}`),
      check: async (password) => same(await sha256(`boss-mode analytics check v1|${password}`), target),
    };
  }
  const secret = env.ANALYTICS_SESSION_SECRET;
  if (!secret) throw new Error("unconfigured");
  const parts = verifier.split(".");
  if (parts.length !== 2 || verifier.length > 100 || secret.length > 100)
    throw new Error("unconfigured");
  const salt = decode(parts[0]),
    hash = decode(parts[1]),
    key = decode(secret);
  if (salt.length !== 16 || hash.length !== 32 || key.length !== 32)
    throw new Error("unconfigured");
  return {
    verifier,
    key,
    check: async (password) => {
      const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const derived = new Uint8Array(
        await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, material, 256),
      );
      return same(derived, hash);
    },
  };
}
async function binding(verifier: string): Promise<string> {
  return encode(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(verifier)),
    ),
  );
}
async function hmacKey(secret: Uint8Array) {
  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
function cookie(value: string, now: number, clear = false): string {
  return `${COOKIE}=${value}; Path=/analytics; Max-Age=${clear ? 0 : SESSION_SECONDS}; Expires=${new Date(clear ? 0 : now + SESSION_SECONDS * 1000).toUTCString()}; HttpOnly; Secure; SameSite=Lax`;
}
export async function authorizePassword(
  request: Request,
  env: PasswordConfiguration,
  now = Date.now(),
): Promise<boolean> {
  try {
    const config = await configuration(env);
    const header = request.headers.get("Cookie");
    if (!header || header.length > 16384) return false;
    const cookies = header
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item.startsWith(`${COOKIE}=`));
    if (cookies.length !== 1) return false;
    const token = cookies[0].slice(COOKIE.length + 1);
    if (token.length > 2048) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const signature = decode(parts[1]);
    if (signature.length !== 32) return false;
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await hmacKey(config.key),
        signature,
        encoder.encode(parts[0]),
      ))
    )
      return false;
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as {
      v?: number;
      iat?: number;
      exp?: number;
      nonce?: string;
      binding?: string;
    };
    const seconds = Math.floor(now / 1000);
    return (
      payload.v === 1 &&
      Number.isSafeInteger(payload.iat) &&
      Number.isSafeInteger(payload.exp) &&
      payload.iat! <= seconds &&
      payload.exp! > seconds &&
      payload.exp! - payload.iat! === SESSION_SECONDS &&
      typeof payload.nonce === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.nonce,
      ) &&
      payload.binding === (await binding(config.verifier))
    );
  } catch {
    return false;
  }
}
export function loginPage(error?: boolean | string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#1b1033"><title>Analytics · Boss Mode</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;font-family:ui-rounded,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(ellipse at top,#50289f,#1b1033 65%);color:#fff}.card{width:min(100%,420px);padding:32px 26px;border:3px solid #120a24;border-radius:24px;background:#2e1f57;box-shadow:0 10px 0 #000}.brand{font-size:13px;letter-spacing:.16em;font-weight:850;color:#ffd23a;text-transform:uppercase}.icon{font-size:32px;display:block;margin-bottom:14px}h1{font-size:30px;line-height:1.1;margin:12px 0}p{color:#d8cdf5;font-size:15px;line-height:1.5;margin-bottom:26px}label{display:block;font-weight:750;margin-bottom:8px}input,button{width:100%;min-height:50px;border-radius:12px;font:inherit}input{background:#1b1033;border:2px solid #7d68b8;color:#fff;padding:12px 14px;font-size:18px}input:focus{outline:3px solid #ffd23a;outline-offset:2px}button{margin-top:18px;padding:13px;border:3px solid #120a24;background:#ffd23a;color:#1b1033;font-weight:850;cursor:pointer;box-shadow:0 5px 0 #000}button:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:4px}.error{margin:16px 0 0;color:#ffc2c2;font-weight:650}.back{display:block;margin-top:24px;text-align:center;font-size:14px;color:#d8cdf5}.hint{font-size:12px;margin:18px 0 0;text-align:center;color:#b6a8e0}
</style></head><body><main class="card"><span class="icon" aria-hidden="true">🐉</span><div class="brand">Boss Mode</div><h1>The boss's war room.</h1><p>Sign in to see how the heroes are doing against your players.</p><form method="post" action="/analytics/login"><label for="password">Dashboard password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus${error ? ' aria-describedby="login-error" aria-invalid="true"' : ""}>${error ? '<p class="error" id="login-error" role="alert">Could not sign in. Check the password and try again.</p>' : ""}<button type="submit">Open the dashboard →</button></form><p class="hint">Private · 6-hour session</p><a class="back" href="/">Back to the game</a></main></body></html>`,
    {
      status,
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        "X-Frame-Options": "DENY",
      },
    },
  );
}
export async function passwordLogin(
  request: Request,
  env: PasswordConfiguration,
  now = Date.now(),
): Promise<Response> {
  if (request.method !== "POST")
    return new Response(null, {
      status: 405,
      headers: { ...BASE_HEADERS, Allow: "POST" },
    });
  if (
    request.headers.get("Origin") !== new URL(request.url).origin ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    return loginPage(true, 403);
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
    "application/x-www-form-urlencoded"
  )
    return loginPage(true, 400);
  if (Number(request.headers.get("Content-Length") || 0) > 1024)
    return loginPage(true, 413);
  let password: string;
  try {
    const reader = request.body?.getReader();
    if (!reader) return loginPage(true, 400);
    const decoder = new TextDecoder();
    let body = "",
      bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return loginPage(true, 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const values = new URLSearchParams(body);
    if (
      values.getAll("password").length !== 1 ||
      [...values.keys()].some((key) => key !== "password")
    )
      return loginPage(true, 400);
    password = values.get("password")!;
    if (!password) return loginPage(true, 401);
  } catch {
    return loginPage(true, 400);
  }
  try {
    const config = await configuration(env);
    if (!(await config.check(password))) return loginPage(true, 401);
    const seconds = Math.floor(now / 1000);
    const payload = encode(
      encoder.encode(
        JSON.stringify({
          v: 1,
          iat: seconds,
          exp: seconds + SESSION_SECONDS,
          nonce: crypto.randomUUID(),
          binding: await binding(config.verifier),
        }),
      ),
    );
    const signature = encode(
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          await hmacKey(config.key),
          encoder.encode(payload),
        ),
      ),
    );
    return new Response(null, {
      status: 303,
      headers: {
        ...BASE_HEADERS,
        Location: "/analytics",
        "Set-Cookie": cookie(`${payload}.${signature}`, now),
      },
    });
  } catch {
    return loginPage(true, 503);
  }
}
export function passwordLogout(): Response {
  return new Response(null, {
    status: 303,
    headers: {
      ...BASE_HEADERS,
      Location: "/analytics",
      "Set-Cookie": cookie("", 0, true),
    },
  });
}
