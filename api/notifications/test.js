// api/notifications/test.js
import prisma from '../../lib/config/prisma.js';
import { requireAuth } from '../../lib/middleware/auth.js';
import { applyCors } from '../../lib/middleware/cors.js';
import { sendNotification } from '../../lib/services/telegramService.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  try {
    const user = await prisma.user.findUnique({
      where:  { id: authUser.sub },
      select: { telegramChatId: true, fullName: true },
    });

    if (!user?.telegramChatId) {
      return res.status(400).json({ success: false, message: 'No Telegram account linked.' });
    }

    const ok = await sendNotification(
      user.telegramChatId,
      `👋 Hello *${user.fullName}*! This is a test notification from TeleAuth. Everything is working!`
    );

    if (!ok) return res.status(500).json({ success: false, message: 'Failed to send notification.' });
    return res.json({ success: true, message: 'Test notification sent to your Telegram!' });
  } catch (err) {
    console.error('test notification error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}
