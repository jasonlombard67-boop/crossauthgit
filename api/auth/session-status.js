// api/auth/session-status.js
// Laptop A polls this every 3s to know when Laptop B has confirmed the session.
import { getSessionStatus } from '../../lib/services/sessionService.js';
import { applyCors } from '../../lib/middleware/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });

  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'sessionId is required.' });
  }

  try {
    const sc = await getSessionStatus(sessionId);
    if (!sc) return res.status(404).json({ success: false, message: 'Session not found.' });

    return res.json({ success: true, status: sc.status, confirmedAt: sc.confirmedAt });
  } catch (err) {
    console.error('session-status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to check session.' });
  }
}
