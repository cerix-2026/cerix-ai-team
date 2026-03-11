import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { initDatabase } from './database';
import agentRoutes from './routes/agent-routes';
import dataRoutes from './routes/data-routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static React dashboard
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/data', dataRoutes);

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
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
async function start() {
  try {
    console.log('🚀 Starting CeriX CEO-AI Agent System...');
    console.log(`📊 Environment: ${config.nodeEnv}`);

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
