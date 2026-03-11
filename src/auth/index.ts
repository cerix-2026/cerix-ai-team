import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env';

// In-memory OTP store (code -> { email, expires, attempts })
const otpStore = new Map<string, { email: string; code: string; expires: number; attempts: number }>();

// In-memory session store (token -> { email, expires })
const sessionStore = new Map<string, { email: string; expires: number }>();

// Allowed email
const ALLOWED_EMAIL = 'kjenneth@cerix.dk';

// Session duration: 30 days
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

// OTP duration: 10 minutes
const OTP_DURATION = 10 * 60 * 1000;

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create email transporter
function getTransporter() {
  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.office365.com',
    port: config.smtpPort || 587,
    secure: false,
    auth: {
      user: config.smtpUser || ALLOWED_EMAIL,
      pass: config.smtpPass,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });
}

// Send OTP email
export async function sendOTPEmail(email: string): Promise<boolean> {
  if (email.toLowerCase() !== ALLOWED_EMAIL) {
    return false;
  }

  // Clear old OTPs for this email
  for (const [key, val] of otpStore.entries()) {
    if (val.email === email) otpStore.delete(key);
  }

  const code = generateOTP();
  const otpKey = crypto.randomBytes(16).toString('hex');

  otpStore.set(otpKey, {
    email: email.toLowerCase(),
    code,
    expires: Date.now() + OTP_DURATION,
    attempts: 0,
  });

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"CeriX CEO-AI" <${config.smtpUser || ALLOWED_EMAIL}>`,
      to: email,
      subject: `🔐 Din login-kode: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">CeriX CEO-AI</h1>
            <p style="color: #71717a; font-size: 14px;">Login bekræftelse</p>
          </div>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 30px; text-align: center;">
            <p style="color: #27272a; font-size: 14px; margin-bottom: 20px;">Din engangskode er:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7c3aed; padding: 15px; background: white; border-radius: 8px; display: inline-block;">
              ${code}
            </div>
            <p style="color: #71717a; font-size: 12px; margin-top: 20px;">Koden udløber om 10 minutter.</p>
          </div>
          <p style="color: #a1a1aa; font-size: 11px; text-align: center; margin-top: 20px;">Hvis du ikke anmodede om denne kode, kan du ignorere denne email.</p>
        </div>
      `,
    });
    console.log(`✅ OTP sendt til ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Fejl ved afsendelse af OTP:', error);
    return false;
  }
}

// Verify OTP and create session
export function verifyOTP(email: string, code: string): string | null {
  for (const [key, otp] of otpStore.entries()) {
    if (otp.email === email.toLowerCase() && otp.code === code) {
      if (Date.now() > otp.expires) {
        otpStore.delete(key);
        return null; // expired
      }
      if (otp.attempts >= 5) {
        otpStore.delete(key);
        return null; // too many attempts
      }
      // Valid! Create session
      otpStore.delete(key);
      const token = generateSessionToken();
      sessionStore.set(token, {
        email: email.toLowerCase(),
        expires: Date.now() + SESSION_DURATION,
      });
      return token;
    }
    // Track attempts
    if (otp.email === email.toLowerCase()) {
      otp.attempts++;
    }
  }
  return null;
}

// Check if a session token is valid
export function isValidSession(token: string): boolean {
  const session = sessionStore.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessionStore.delete(token);
    return false;
  }
  return true;
}

// Auth middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for auth routes and health check
  if (req.path.startsWith('/api/auth') || req.path === '/api/health') {
    return next();
  }

  // Check for login page (served as static HTML)
  if (req.path === '/login' || req.path === '/login.html') {
    return next();
  }

  // Check session cookie
  const token = req.cookies?.cerix_session;
  if (token && isValidSession(token)) {
    return next();
  }

  // For API routes, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Ikke autoriseret. Log venligst ind.' });
  }

  // For page routes, redirect to login
  res.redirect('/login');
}
