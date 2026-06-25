// api/auth/login.js
import bcrypt from 'bcrypt';
import prisma from '../../lib/config/prisma.js';
import { applyCors } from '../../lib/middleware/cors.js';
import { createOtpToken, expireUserOtps } from '../../lib/services/otpService.js';
import { createSessionConfirmation } from '../../lib/services/sessionService.js';
import { sendLoginDeepLink } from '../../lib/services/telegramService.js';
import { OTP_TYPES } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  try {
    const { email, password, requestDevice } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const requestIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.telegramChatId) {
      return res.status(403).json({
        success: false,
        message: 'No Telegram account linked. Please link Telegram first.',
        requiresTelegramLink: true,
      });
    }

    await expireUserOtps(user.id, OTP_TYPES.LOGIN);

    const otp = await createOtpToken({
      userId: user.id,
      type:   OTP_TYPES.LOGIN,
      requestIp,
      requestDevice: requestDevice || 'Unknown Device',
    });

    const sc = await createSessionConfirmation(user.id, otp.id);

    // Send Telegram message directly (no queue needed on serverless)
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    await sendLoginDeepLink({
      chatId:        user.telegramChatId,
      otpToken:      otp.token,
      requestDevice: requestDevice || 'Unknown Device',
      requestIp,
      appUrl,
    });

    return res.json({
      success:   true,
      message:   '📱 A login link has been sent to your Telegram. Please click it to continue.',
      sessionId: sc.id,
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
}
