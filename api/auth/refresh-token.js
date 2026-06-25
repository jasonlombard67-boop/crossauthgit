// api/auth/refresh-token.js
import prisma from '../../lib/config/prisma.js';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../lib/services/jwtService.js';
import { parseCookies, setCookie, clearCookie, applyCors } from '../../lib/middleware/cors.js';
import { COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const cookies = parseCookies(req);
  const token   = cookies[REFRESH_TOKEN_COOKIE];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token.' });
  }

  try {
    const payload = verifyRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or revoked.' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    // Rotate: revoke old, issue new pair
    await prisma.refreshToken.update({ where: { token }, data: { revokedAt: new Date() } });

    const newAccess  = generateAccessToken({ sub: user.id, email: user.email });
    const newRefresh = generateRefreshToken({ sub: user.id, email: user.email });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    await prisma.refreshToken.create({ data: { userId: user.id, token: newRefresh, expiresAt: expiry } });

    setCookie(res, ACCESS_TOKEN_COOKIE,  newAccess,  { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
    setCookie(res, REFRESH_TOKEN_COOKIE, newRefresh, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });

    return res.json({ success: true, message: 'Tokens refreshed.' });
  } catch (err) {
    console.error('refresh-token error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
}
