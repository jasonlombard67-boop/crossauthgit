// api/meta.js
import { applyCors } from '../lib/middleware/cors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  res.json({ botName: process.env.TELEGRAM_BOT_NAME || 'TeleAuthBot' });
}
