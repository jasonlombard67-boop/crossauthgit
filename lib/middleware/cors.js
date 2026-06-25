// lib/middleware/cors.js
import cookie from 'cookie';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Apply CORS headers and handle preflight OPTIONS requests.
 * Returns true if the handler should stop (preflight handled).
 */
export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin',      APP_URL);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',     'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // caller should return immediately
  }
  return false;
}

/** Parse cookies from the request into an object. */
export function parseCookies(req) {
  return cookie.parse(req.headers.cookie || '');
}

/** Serialize a cookie and append it as a Set-Cookie header. */
export function setCookie(res, name, value, options = {}) {
  const existing = res.getHeader('Set-Cookie') || [];
  const cookies  = Array.isArray(existing) ? existing : [existing];
  cookies.push(cookie.serialize(name, value, options));
  res.setHeader('Set-Cookie', cookies);
}

/** Clear a cookie by setting maxAge=0. */
export function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', { ...options, maxAge: 0 });
}
