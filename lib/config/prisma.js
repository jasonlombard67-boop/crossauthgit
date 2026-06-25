// lib/config/prisma.js
// In serverless environments each function invocation can reuse the same
// module cache within the same container lifetime, so we attach the client
// to `globalThis` to avoid exhausting the DB connection pool.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Always cache on globalThis so warm serverless containers reuse the connection pool.
// Without this, each invocation in the same container opens a new pool.
globalForPrisma.prisma = prisma;

export default prisma;
