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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(10) DEFAULT '🔧',
        category VARCHAR(50) NOT NULL,
        agents JSON,
        prompt TEXT NOT NULL,
        installed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_slug (slug)
      )
    `);

    // Seed default skills if table is empty
    const [skillRows] = await connection.query('SELECT COUNT(*) as cnt FROM skills');
    if ((skillRows as any)[0].cnt === 0) {
      await connection.query(`INSERT INTO skills (name, slug, description, icon, category, agents, prompt, installed) VALUES
        ('LinkedIn Outreach', 'linkedin-outreach', 'Skriv professionelle LinkedIn-forbindelsesanmodninger og beskeder tilpasset modtagerens profil og branche.', '💼', 'Outreach', '["content","leadgen"]', 'Du har nu evnen til at skrive LinkedIn outreach-beskeder. Skriv altid personlige, ikke-spammy beskeder der refererer til modtagerens virksomhed og rolle. Hold beskeder under 300 tegn for forbindelsesanmodninger.', false),
        ('SEO Analyse', 'seo-analyse', 'Analysér websider for SEO-optimering, keyword-muligheder og teknisk SEO.', '🔍', 'Research', '["research"]', 'Du kan nu analysere websites for SEO. Vurdér title tags, meta descriptions, heading-struktur, keyword-densitet, page speed indikatorer og intern linking. Giv konkrete forbedringer.', false),
        ('Email Sekvenser', 'email-sekvenser', 'Opret automatiserede email-sekvenser med follow-ups, timing og A/B test varianter.', '📧', 'Outreach', '["content"]', 'Du kan nu oprette email-sekvenser. Design multi-step email flows med: 1) Åbnings-email, 2) Follow-up efter 3 dage, 3) Værdi-email efter 7 dage, 4) Sidste chance efter 14 dage. Inkludér subject lines og personalisering.', false),
        ('Konkurrentanalyse', 'konkurrentanalyse', 'Dybdegående analyse af konkurrenter inkl. prissætning, positionering, styrker og svagheder.', '⚔️', 'Research', '["research","ceo"]', 'Du kan nu lave detaljerede konkurrentanalyser. Strukturér altid analysen med: Virksomhedsoverblik, Produkter/Services, Prissætning, Markedspositionering, Styrker, Svagheder, Muligheder for differentiering.', false),
        ('Finansiel Forecasting', 'finansiel-forecasting', 'Lav revenue forecasts, cash flow projektioner og break-even analyser.', '📈', 'Finance', '["finance"]', 'Du kan nu lave finansielle forecasts. Brug konservative, realistiske og optimistiske scenarier. Inkludér altid: Monthly Recurring Revenue (MRR), Customer Acquisition Cost (CAC), Lifetime Value (LTV), Burn Rate og Runway.', false),
        ('Cold Call Script', 'cold-call-script', 'Generér effektive cold call scripts tilpasset branchen og beslutningstageren.', '📞', 'Sales', '["content","leadgen"]', 'Du kan nu skrive cold call scripts. Strukturér med: Åbning (10 sek), Værdiforslag (20 sek), Kvalificering (spørgsmål), Indvendingshåndtering, og Call-to-Action. Tilpas sproget til dansk erhvervskultur.', false),
        ('Social Media Plan', 'social-media-plan', 'Opret content-kalendere og strategi for LinkedIn, Facebook, Instagram og X.', '📱', 'Content', '["content"]', 'Du kan nu lave social media planer. Lav ugentlige content-kalendere med: Platform, Indholdstype, Emne, Hashtags, Bedste tidspunkt at poste, og CTA. Fokusér på LinkedIn for B2B.', false),
        ('SWOT Analyse', 'swot-analyse', 'Udfør struktureret SWOT-analyse (Strengths, Weaknesses, Opportunities, Threats).', '🎯', 'Strategy', '["ceo","research"]', 'Du kan nu lave SWOT-analyser. Giv minimum 5 punkter for hvert område. Prioritér efter impact og sandsynlighed. Afslut med strategiske anbefalinger baseret på SWOT-krydskombinationer.', false),
        ('Proposal Generator', 'proposal-generator', 'Generér professionelle tilbud og proposals til potentielle kunder.', '📄', 'Sales', '["content","ceo"]', 'Du kan nu generere professionelle tilbud. Strukturér med: Executive Summary, Problemforståelse, Løsningsforslag, Scope & Deliverables, Tidsplan, Prissætning, Vilkår, og Næste Skridt. Skriv i professionelt dansk forretningssprog.', false),
        ('KPI Dashboard Setup', 'kpi-dashboard', 'Definér og opsæt relevante KPIs for din virksomhed med targets og tracking.', '📊', 'Finance', '["finance","ceo"]', 'Du kan nu definere KPI-frameworks. Brug SMART-kriterier for alle KPIs. Kategorisér i: Revenue KPIs, Marketing KPIs, Sales KPIs, Customer Success KPIs. Sæt realistiske targets baseret på branchestandarder.', false),
        ('Dansk Lovgivning', 'dansk-lovgivning', 'Tjek compliance med dansk erhvervslovgivning, GDPR, bogføringslov og ansættelsesret.', '⚖️', 'Compliance', '["research","ceo"]', 'Du kan nu rådgive om dansk erhvervslovgivning. Dæk GDPR, Bogføringsloven, Markedsføringsloven, Ansættelsesretlige regler, og Selskabsloven. Giv altid disclaimer om at søge professionel juridisk rådgivning.', false),
        ('AI Automation Audit', 'ai-automation-audit', 'Identificér processer i en virksomhed der kan automatiseres med AI.', '🤖', 'Strategy', '["ceo","research"]', 'Du kan nu lave AI automation audits. Evaluér forretningsprocesser efter: Automatiseringspotentiale (høj/mellem/lav), Estimeret tidsbesparelse, Implementeringskompleksitet, ROI-estimat, og Anbefalede AI-værktøjer.', false)
      `);
    }

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
