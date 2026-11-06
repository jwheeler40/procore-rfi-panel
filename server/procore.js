// Thin Procore client + in-memory OAuth session store (swap for Redis/DB in production).
const API = process.env.PROCORE_API_BASE || 'https://sandbox.procore.com';
const LOGIN = process.env.PROCORE_LOGIN_BASE || 'https://login-sandbox.procore.com';
const sessions = new Map(); // sid -> { access, refresh, expires } | null while sign-in is pending

export const authUrl = (sid) =>
  `${LOGIN}/oauth/authorize?response_type=code&client_id=${process.env.PROCORE_CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(process.env.PROCORE_REDIRECT_URI)}&state=${sid}`;

async function token(body) {
  const r = await fetch(`${LOGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PROCORE_CLIENT_ID,
      client_secret: process.env.PROCORE_CLIENT_SECRET,
      redirect_uri: process.env.PROCORE_REDIRECT_URI,
      ...body,
    }),
  });
  if (!r.ok) throw new Error(`Procore auth failed (${r.status})`);
  const t = await r.json();
  return { access: t.access_token, refresh: t.refresh_token, expires: Date.now() + (t.expires_in - 60) * 1000 };
}

export const startSession = (sid) => sessions.set(sid, null);
export const hasPending = (sid) => sessions.has(sid) && sessions.get(sid) === null;
export const isSignedIn = (sid) => !!sessions.get(sid);
export async function completeSession(sid, code) {
  sessions.set(sid, await token({ grant_type: 'authorization_code', code }));
}

// Returns a client bound to one session + company.
export function clientFor(sid, companyId) {
  async function call(method, path, body) {
    let s = sessions.get(sid);
    if (!s) throw Object.assign(new Error('Not signed in'), { status: 401 });
    if (Date.now() > s.expires) {
      s = await token({ grant_type: 'refresh_token', refresh_token: s.refresh });
      sessions.set(sid, s);
    }
    const r = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${s.access}`,
        'Procore-Company-Id': String(companyId),
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(`Procore ${r.status}: ${text.slice(0, 300)}`), { status: r.status });
    return text ? JSON.parse(text) : {};
  }
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b) };
}
