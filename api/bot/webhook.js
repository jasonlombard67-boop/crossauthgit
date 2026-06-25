// api/bot/webhook.js
// Telegram calls this endpoint for every incoming message/command.
// Replaces the long-polling Telegraf bot — works perfectly on Vercel.
import prisma from '../../lib/config/prisma.js';
import { markOtpUsed } from '../../lib/services/otpService.js';
import { sendNotification } from '../../lib/services/telegramService.js';
import { OTP_TYPES } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  // Telegram sends POST with the update payload
  if (req.method !== 'POST') return res.status(405).end();

  // Verify the secret token header to prevent spoofing
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).end();
  }

  try {
    const update = req.body;
    const message = update?.message;
    if (!message?.text) return res.status(200).end(); // ignore non-text updates

    const chatId   = String(message.chat.id);
    const text     = message.text.trim();
    const username = message.from?.username || message.from?.first_name || 'there';

    // ── /start ────────────────────────────────────────────────────────────
    if (text === '/start' || text.startsWith('/start ')) {
      await sendNotification(chatId,
        `👋 Welcome to *TeleAuth Bot*, ${username}!\n\n` +
        `I send you one-click login links when you sign in.\n\n` +
        `*Commands:*\n` +
        `/link <code> — Link your Telegram account\n` +
        `/unlink — Unlink your account\n` +
        `/status — Check link status\n` +
        `/help — Show commands`
      );
      return res.status(200).end();
    }

    // ── /help ─────────────────────────────────────────────────────────────
    if (text === '/help') {
      await sendNotification(chatId,
        `*TeleAuth Bot Commands*\n\n` +
        `/link <code> — Link your account (get code from the web app)\n` +
        `/unlink — Remove your Telegram link\n` +
        `/status — Check if your account is linked`
      );
      return res.status(200).end();
    }

    // ── /link <code> ──────────────────────────────────────────────────────
    if (text.startsWith('/link')) {
      const parts = text.split(' ');
      const code  = parts[1];

      if (!code) {
        await sendNotification(chatId, '❌ Usage: `/link 123456` — get the code from the web app.');
        return res.status(200).end();
      }

      const otp = await prisma.otpToken.findFirst({
        where: {
          token:     `link_${code}`,
          type:      OTP_TYPES.TELEGRAM_LINK,
          usedAt:    null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!otp) {
        await sendNotification(chatId, '❌ Invalid or expired code. Please request a new one from the web app.');
        return res.status(200).end();
      }

      // Check this Telegram account isn't already linked to a different user
      const existing = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
      if (existing && existing.id !== otp.userId) {
        await sendNotification(chatId, '⚠️ This Telegram account is already linked to another user.');
        return res.status(200).end();
      }

      await markOtpUsed(otp.id);

      await prisma.user.update({
        where: { id: otp.userId },
        data: {
          telegramChatId:   chatId,
          telegramUsername: message.from?.username || null,
          telegramLinkedAt: new Date(),
        },
      });

      await sendNotification(chatId,
        `✅ *Account linked successfully!*\n\n` +
        `Welcome, *${otp.user.fullName}*! You will now receive login links here.`
      );
      return res.status(200).end();
    }

    // ── /unlink ───────────────────────────────────────────────────────────
    if (text === '/unlink') {
      const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
      if (!user) {
        await sendNotification(chatId, 'ℹ️ No account is currently linked to this Telegram chat.');
        return res.status(200).end();
      }

      await prisma.user.update({
        where: { id: user.id },
        data:  { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null },
      });

      await sendNotification(chatId, '✅ Your Telegram account has been unlinked successfully.');
      return res.status(200).end();
    }

    // ── /status ───────────────────────────────────────────────────────────
    if (text === '/status') {
      const user = await prisma.user.findUnique({
        where:  { telegramChatId: chatId },
        select: { email: true, fullName: true, telegramLinkedAt: true },
      });

      if (!user) {
        await sendNotification(chatId,
          '❌ No account linked.\n\nUse `/link <code>` after getting a code from the web app.'
        );
      } else {
        await sendNotification(chatId,
          `✅ *Account Linked*\n\n` +
          `👤 ${user.fullName}\n` +
          `📧 ${user.email}\n` +
          `🔗 Since: ${user.telegramLinkedAt?.toLocaleDateString() || 'Unknown'}`
        );
      }
      return res.status(200).end();
    }

    // ── Unknown ───────────────────────────────────────────────────────────
    await sendNotification(chatId, '❓ Unknown command. Type /help to see available commands.');
    return res.status(200).end();

  } catch (err) {
    console.error('Webhook handler error:', err);
    // Always return 200 to Telegram — otherwise it retries indefinitely
    return res.status(200).end();
  }
}
