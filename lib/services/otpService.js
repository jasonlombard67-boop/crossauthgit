// lib/services/otpService.js
import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';
import { OTP_EXPIRY_MINUTES, OTP_TYPES } from '../config/constants.js';

export async function createOtpToken({ userId, type = OTP_TYPES.LOGIN, requestIp, requestDevice }) {
  const token     = `otp_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return prisma.otpToken.create({ data: { userId, token, type, requestIp, requestDevice, expiresAt } });
}

export async function validateOtpToken(token) {
  const otp = await prisma.otpToken.findUnique({ where: { token }, include: { user: true } });
  if (!otp)         throw new Error('Invalid or unknown OTP token.');
  if (otp.usedAt)   throw new Error('This login link has already been used.');
  if (new Date() > otp.expiresAt) throw new Error('This login link has expired.');
  return otp;
}

export async function markOtpUsed(tokenId) {
  return prisma.otpToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
}

export async function expireUserOtps(userId, type = OTP_TYPES.LOGIN) {
  await prisma.otpToken.updateMany({
    where: { userId, type, usedAt: null, expiresAt: { gt: new Date() } },
    data:  { usedAt: new Date() },
  });
}
