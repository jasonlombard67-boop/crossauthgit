// lib/services/jwtService.js
import jwt from 'jsonwebtoken';

const access = {
  secret: process.env.JWT_ACCESS_SECRET  || 'fallback_access_secret_change_in_production',
  expiry: process.env.JWT_ACCESS_EXPIRY  || '15m',
};
const refresh = {
  secret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_in_production',
  expiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

export const generateAccessToken  = (payload) => jwt.sign(payload, access.secret,  { expiresIn: access.expiry  });
export const generateRefreshToken = (payload) => jwt.sign(payload, refresh.secret, { expiresIn: refresh.expiry });
export const verifyAccessToken    = (token)   => jwt.verify(token, access.secret);
export const verifyRefreshToken   = (token)   => jwt.verify(token, refresh.secret);
