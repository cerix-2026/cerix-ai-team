import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '../config/env';
import * as schema from './schema';

let db: any;
let pool: any;

export async function initDatabase() {
  const poolConfig: any = config.database.url
    ? { uri: config.database.url, waitForConnections: true, connectionLimit: 10 }
    : {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
      };

  pool = mysql.createPool(poolConfig);
  db = drizzle(pool, { schema, mode: 'default' });

  // Create tables if they don't exist
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(500),
        industry VARCHAR(100),
        company_size VARCHAR(50),
        location VARCHAR(255),
        score INT DEFAULT 0,
        status ENUM('new','contacted','qualified','proposal','won','lost') DEFAULT 'new',
        source VARCHAR(100),
        notes TEXT,
        ai_analysis TEXT,
        last_contacted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_agent ENUM('ceo','research','leadgen','content','finance') NOT NULL,
        status ENUM('pending','in_progress','completed','failed') DEFAULT 'pending',
        priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
        input JSON,
        output JSON,
        parent_job_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        job_id INT,
        status ENUM('info','success','warning','error') DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS outreach_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        status ENUM('draft','sent','opened','replied','bounced') DEFAULT 'draft',
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS revenue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source ENUM('ai_services','saas','leadgen') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'DKK',
        description VARCHAR(500),
        client_name VARCHAR(255),
        period VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS kpi_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date VARCHAR(10) NOT NULL,
        total_leads INT DEFAULT 0,
        qualified_leads INT DEFAULT 0,
        emails_sent INT DEFAULT 0,
        emails_opened INT DEFAULT 0,
        meetings_booked INT DEFAULT 0,
        monthly_revenue DECIMAL(10,2) DEFAULT 0,
        active_clients INT DEFAULT 0,
        agent_tasks_completed INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS research_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        topic VARCHAR(255),
        content TEXT NOT NULL,
        summary TEXT,
        job_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  } finally {
    connection.release();
  }

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function getPool() {
  return pool;
}
