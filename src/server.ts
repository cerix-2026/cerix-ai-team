import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env';
import { initDatabase } from './database';
import agentRoutes from './routes/agent-routes';
import dataRoutes from './routes/data-routes';
import skillRoutes from './routes/skill-routes';
import { authMiddleware, sendOTPEmail, verifyOTP } from './auth';

const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth API routes (before auth middleware)
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email er påkrævet' });
  }
  if (email.toLowerCase() !== 'kjenneth@cerix.dk') {
    return res.status(403).json({ success: false, error: 'Denne email har ikke adgang.' });
  }
  const sent = await sendOTPEmail(email);
  if (sent) {
    res.json({ success: true, message: 'Kode sendt til din email' });
  } else {
    res.status(500).json({ success: false, error: 'Kunne ikke sende kode. Tjek SMTP-indstillinger.' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email og kode er påkrævet' });
  }
  const token = verifyOTP(email, code);
  if (token) {
    res.cookie('cerix_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    res.json({ success: true, message: 'Login succesfuldt!' });
  } else {
    res.status(401).json({ success: false, error: 'Ugyldig eller udløbet kode.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('cerix_session');
  res.json({ success: true, message: 'Logget ud' });
});

app.get('/api/auth/status', (req, res) => {
  const token = req.cookies?.cerix_session;
  const { isValidSession } = require('./auth');
  res.json({ authenticated: token ? isValidSession(token) : false });
});

// Serve login page (before auth middleware)
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Auth middleware — protects everything below
app.use(authMiddleware);

// Serve static React dashboard (protected)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (protected)
app.use('/api/agents', agentRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/skills', skillRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'CeriX CEO-AI Agent System',
    version: '1.0.0',
    agents: ['ceo', 'research', 'leadgen', 'content', 'finance'],
    timestamp: new Date().toISOString(),
  });
});

// Catch-all: serve React app
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
async function start() {
  try {
    console.log('🚀 Starting CeriX CEO-AI Agent System...');
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`🔐 Auth: Email OTP (kjenneth@cerix.dk)`);

    // Initialize database
    await initDatabase();
    console.log('✅ Database connected');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🌐 Server running on port ${config.port}`);
      console.log(`📡 API: http://localhost:${config.port}/api`);
      console.log(`📊 Dashboard: http://localhost:${config.port}`);
      console.log('');
      console.log('🧠 CEO Agent: Ready');
      console.log('🔍 Research Agent: Ready');
      console.log('🎯 LeadGen Agent: Ready');
      console.log('✍️  Content Agent: Ready');
      console.log('📊 Finance Agent: Ready');
      console.log('');
      console.log('💡 Send en opgave: POST /api/agents/task');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
