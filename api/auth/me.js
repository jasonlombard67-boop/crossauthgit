// api/auth/me.js
import prisma from '../../lib/config/prisma.js';
import { requireAuth } from '../../lib/middleware/auth.js';
import { applyCors } from '../../lib/middleware/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  try {
    const user = await prisma.user.findUnique({
      where:  { id: authUser.sub },
      select: {
        id: true, email: true, fullName: true,
        telegramUsername: true, telegramLinkedAt: true,
        lastLoginAt: true, createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
}
