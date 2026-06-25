// lib/services/sessionService.js
// NOTE: In serverless, in-memory state (like SSE client maps) is lost between
// invocations. Cross-device sync now works via DB polling — the login page polls
// /api/auth/session-status every 3s, which is fast and reliable.
import prisma from '../config/prisma.js';
import { SESSION_STATUS } from '../config/constants.js';

export async function createSessionConfirmation(userId, otpTokenId) {
  return prisma.sessionConfirmation.create({
    data: { userId, otpTokenId, status: SESSION_STATUS.PENDING },
  });
}

export async function confirmSession(sessionId, confirmedDeviceIp) {
  return prisma.sessionConfirmation.update({
    where: { id: sessionId },
    data: {
      status:           SESSION_STATUS.CONFIRMED,
      confirmedDeviceIp,
      confirmedAt:      new Date(),
    },
  });
}

export async function getSessionStatus(sessionId) {
  return prisma.sessionConfirmation.findUnique({ where: { id: sessionId } });
}
