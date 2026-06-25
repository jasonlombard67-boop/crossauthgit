// api/auth/telegram-verify.js
import prisma from '../../lib/config/prisma.js';
import { validateOtpToken, markOtpUsed } from '../../lib/services/otpService.js';
import { confirmSession } from '../../lib/services/sessionService.js';
import { generateAccessToken, generateRefreshToken } from '../../lib/services/jwtService.js';
import { setCookie, applyCors } from '../../lib/middleware/cors.js';
import { COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_STATUS } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  // GET — triggered by clicking the Telegram button
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });

  const { token } = req.query;
  const confirmedIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress;

  if (!token) {
    return res.status(400).send(renderError('Missing token parameter.'));
  }

  try {
    const otp = await validateOtpToken(token);
    await markOtpUsed(otp.id);

    // Mark session confirmed so Laptop A polling sees it
    const sc = await prisma.sessionConfirmation.findFirst({
      where: { otpTokenId: otp.id, status: SESSION_STATUS.PENDING },
    });
    if (sc) {
      await confirmSession(sc.id, confirmedIp);
    }

    await prisma.user.update({
      where: { id: otp.userId },
      data:  { lastLoginAt: new Date(), lastLoginIp: confirmedIp },
    });

    // Issue JWT pair
    const payload      = { sub: otp.user.id, email: otp.user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId:     otp.user.id,
        token:      refreshToken,
        expiresAt:  refreshExpiry,
        deviceInfo: { ip: confirmedIp, verifiedAt: new Date().toISOString() },
      },
    });

    // Set HTTP-only cookies
    setCookie(res, ACCESS_TOKEN_COOKIE,  accessToken,  { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
    setCookie(res, REFRESH_TOKEN_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });

    return res.redirect(302, '/dashboard');
  } catch (err) {
    console.warn('Telegram verify failed:', err.message);
    return res.status(400).send(renderError(err.message));
  }
}

function renderError(message) {
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Auth Error — TeleAuth</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
    min-height:100vh;margin:0;background:#0f1117;color:#e2e8f0}
    .box{background:#1a1d27;border:1px solid #2a2d3e;padding:2rem 2.5rem;border-radius:14px;
    text-align:center;max-width:420px}
    h1{color:#ef4444;margin-bottom:.75rem}p{color:#94a3b8;margin-bottom:1.5rem}
    a{color:#6366f1;text-decoration:none}a:hover{text-decoration:underline}
  </style>
</head><body>
  <div class="box">
    <h1>⚠️ Authentication Failed</h1>
    <p>${message}</p>
    <a href="/login">← Back to Login</a>
  </div>
</body></html>`;
}
