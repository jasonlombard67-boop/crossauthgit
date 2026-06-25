// api/auth/login-for-link.js
import bcrypt from 'bcrypt';
import prisma from '../../lib/config/prisma.js';
import { generateAccessToken } from '../../lib/services/jwtService.js';
import { setCookie, applyCors } from '../../lib/middleware/cors.js';
import { COOKIE_OPTIONS, ACCESS_TOKEN_COOKIE } from '../../lib/config/constants.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateAccessToken({ sub: user.id, email: user.email });
    setCookie(res, ACCESS_TOKEN_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });

    return res.json({ success: true });
  } catch (err) {
    console.error('login-for-link error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}
