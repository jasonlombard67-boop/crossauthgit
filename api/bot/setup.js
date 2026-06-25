// api/bot/setup.js
// Visit this URL once after deploying to register the Telegram webhook.
// Protect it with a setup secret so strangers can't call it.
// GET /api/bot/setup?secret=YOUR_SETUP_SECRET
import { registerWebhook, getWebhookInfo } from '../../lib/services/telegramService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { secret } = req.query;
  if (secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Provide ?secret=YOUR_SETUP_SECRET' });
  }

  try {
    const appUrl = process.env.APP_URL;
    if (!appUrl) return res.status(500).json({ error: 'APP_URL env var not set.' });

    const ok = await registerWebhook(appUrl);

    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to register webhook with Telegram.' });
    }

    const info = await getWebhookInfo();
    return res.json({ success: true, message: 'Webhook registered!', info });
  } catch (err) {
    console.error('Bot setup error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
