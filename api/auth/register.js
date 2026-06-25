// api/auth/register.js
import bcrypt from 'bcrypt';
import prisma from '../../lib/config/prisma.js';
import { applyCors } from '../../lib/middleware/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'email, password, and fullName are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });

    return res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
}
