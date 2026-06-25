// lib/middleware/auth.js
import { verifyAccessToken } from '../services/jwtService.js';
import { parseCookies } from './cors.js';
import { ACCESS_TOKEN_COOKIE } from '../config/constants.js';

/**
 * Verify the access token cookie.
 * Returns the decoded payload, or sends a 401 and returns null.
 */
export function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const token   = cookies[ACCESS_TOKEN_COOKIE];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return null;
  }

  try {
    return verifyAccessToken(token);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    return null;
  }
}
