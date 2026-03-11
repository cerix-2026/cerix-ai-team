import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'anthropic/claude-sonnet-4',
  database: {
    url: process.env.MYSQL_URL || process.env.DATABASE_URL || '',
    host: process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || '3306'),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
  },
  gmail: {
    mcpUrl: process.env.GMAIL_MCP_URL || 'https://gmail.mcp.claude.com/mcp',
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
