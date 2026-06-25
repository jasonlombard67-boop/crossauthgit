// lib/services/telegramService.js
// Uses the Telegram Bot API directly via fetch() — no persistent bot process needed.
// This works perfectly on Vercel serverless functions.

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/** Escape all MarkdownV2 reserved characters in a string. */
function escMd(str) {
  return String(str ?? '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Low-level POST to Telegram Bot API. */
async function tgPost(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.startsWith('123456789:')) {
    console.warn('TELEGRAM_BOT_TOKEN not set — skipping Telegram call');
    return false;
  }

  const res = await fetch(`${BASE()}/${method}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Telegram API error [${method}]:`, err);
    return false;
  }
  return true;
}

/**
 * Send the deep-link login message with an inline keyboard button.
 */
export async function sendLoginDeepLink({ chatId, otpToken, requestDevice, requestIp, appUrl }) {
  const verifyUrl = `${appUrl}/auth/telegram-verify?token=${otpToken}`;
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false });

  const lines = [
    '🔐 *Login Request Detected*',
    '',
    `📍 *From:* ${escMd(requestDevice || 'Unknown Device')}`,
    `🕐 *Time:* ${escMd(timestamp)} UTC`,
  ];
  if (requestIp) lines.push(`🌐 *IP:* \`${escMd(requestIp)}\``);
  lines.push('', '👇 Click the button below to instantly log in\\. Expires in 5 minutes\\.', '');
  lines.push('🔒 If you did not request this, ignore this message\\.');

  return tgPost('sendMessage', {
    chat_id:    chatId,
    text:       lines.join('\n'),
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [[{ text: '🔑 Login to Dashboard', url: verifyUrl }]],
    },
  });
}

/**
 * Send a plain text notification.
 */
export async function sendNotification(chatId, text) {
  return tgPost('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

/**
 * Register the webhook with Telegram so it calls our /api/bot/webhook endpoint.
 * Call this once from /api/bot/setup.
 */
export async function registerWebhook(appUrl) {
  const webhookUrl = `${appUrl}/api/bot/webhook`;
  return tgPost('setWebhook', {
    url:             webhookUrl,
    allowed_updates: ['message'],
    drop_pending_updates: true,
    secret_token:    process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  });
}

/**
 * Get current webhook info (for debugging).
 */
export async function getWebhookInfo() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${BASE()}/getWebhookInfo`);
  return res.json();
}
