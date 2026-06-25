// api/auth/logout.js
import prisma from '../../lib/config/prisma.js';
import { parseCookies, clearCookie, applyCors } from '../../lib/middleware/cors.js';
import { COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const cookies = parseCookies(req);
  const token   = cookies[REFRESH_TOKEN_COOKIE];

  if (token) {
    await prisma.refreshToken
      .update({ where: { token }, data: { revokedAt: new Date() } })
      .catch(() => {});
  }

  clearCookie(res, ACCESS_TOKEN_COOKIE,  COOKIE_OPTIONS);
  clearCookie(res, REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);

  return res.json({ success: true, message: 'Logged out.' });
}
