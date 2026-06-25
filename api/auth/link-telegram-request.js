// api/auth/link-telegram-request.js
import prisma from '../../lib/config/prisma.js';
import { requireAuth } from '../../lib/middleware/auth.js';
import { applyCors } from '../../lib/middleware/cors.js';
import { expireUserOtps } from '../../lib/services/otpService.js';
import { OTP_TYPES } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const { telegramChatId } = req.body;
  if (!telegramChatId) {
    return res.status(400).json({ success: false, message: 'telegramChatId is required.' });
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await expireUserOtps(authUser.sub, OTP_TYPES.TELEGRAM_LINK);

    await prisma.otpToken.create({
      data: {
        userId:        authUser.sub,
        token:         `link_${code}`,
        type:          OTP_TYPES.TELEGRAM_LINK,
        expiresAt:     new Date(Date.now() + 5 * 60 * 1000),
        requestDevice: telegramChatId,
      },
    });

    const botName = process.env.TELEGRAM_BOT_NAME || 'TeleAuthBot';
    return res.json({
      success: true,
      message: `Send this code to @${botName} on Telegram: /link ${code}`,
      code,
      chatId: telegramChatId,
    });
  } catch (err) {
    console.error('link-telegram-request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate link code.' });
  }
}
