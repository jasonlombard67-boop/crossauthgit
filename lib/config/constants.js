// lib/config/constants.js
export const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export const ACCESS_TOKEN_COOKIE  = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const OTP_TYPES = {
  LOGIN:          'login',
  TELEGRAM_LINK:  'telegram_link',
  PASSWORD_RESET: 'password_reset',
};

export const SESSION_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  EXPIRED:   'expired',
  FAILED:    'failed',
};
