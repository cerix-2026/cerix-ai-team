import { mysqlTable, varchar, text, int, timestamp, mysqlEnum, decimal, json, boolean } from 'drizzle-orm/mysql-core';

// ==================== LEADS ====================
export const leads = mysqlTable('leads', {
  id: int('id').primaryKey().autoincrement(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 500 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  location: varchar('location', { length: 255 }),
  score: int('score').default(0),
  status: mysqlEnum('status', ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).default('new'),
  source: varchar('source', { length: 100 }),
  notes: text('notes'),
  aiAnalysis: text('ai_analysis'),
  lastContactedAt: timestamp('last_contacted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ==================== JOBS / TASKS ====================
export const jobs = mysqlTable('jobs', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  assignedAgent: mysqlEnum('assigned_agent', ['ceo', 'research', 'leadgen', 'content', 'finance']).notNull(),
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'failed']).default('pending'),
  priority: mysqlEnum('priority', ['low', 'medium', 'high', 'urgent']).default('medium'),
  input: json('input'),
  output: json('output'),
  parentJobId: int('parent_job_id'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// ==================== AGENT ACTIVITY LOG ====================
export const agentLogs = mysqlTable('agent_logs', {
  id: int('id').primaryKey().autoincrement(),
  agent: varchar('agent', { length: 50 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  details: text('details'),
  jobId: int('job_id'),
  status: mysqlEnum('status', ['info', 'success', 'warning', 'error']).default('info'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== OUTREACH EMAILS ====================
export const outreachEmails = mysqlTable('outreach_emails', {
  id: int('id').primaryKey().autoincrement(),
  leadId: int('lead_id').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  status: mysqlEnum('status', ['draft', 'sent', 'opened', 'replied', 'bounced']).default('draft'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== REVENUE / KPI ====================
export const revenue = mysqlTable('revenue', {
  id: int('id').primaryKey().autoincrement(),
  source: mysqlEnum('source', ['ai_services', 'saas', 'leadgen']).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('DKK'),
  description: varchar('description', { length: 500 }),
  clientName: varchar('client_name', { length: 255 }),
  period: varchar('period', { length: 7 }), // YYYY-MM format
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== KPI SNAPSHOTS ====================
export const kpiSnapshots = mysqlTable('kpi_snapshots', {
  id: int('id').primaryKey().autoincrement(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  totalLeads: int('total_leads').default(0),
  qualifiedLeads: int('qualified_leads').default(0),
  emailsSent: int('emails_sent').default(0),
  emailsOpened: int('emails_opened').default(0),
  meetingsBooked: int('meetings_booked').default(0),
  monthlyRevenue: decimal('monthly_revenue', { precision: 10, scale: 2 }).default('0'),
  activeClients: int('active_clients').default(0),
  agentTasksCompleted: int('agent_tasks_completed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== RESEARCH REPORTS ====================
export const researchReports = mysqlTable('research_reports', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 500 }).notNull(),
  topic: varchar('topic', { length: 255 }),
  content: text('content').notNull(),
  summary: text('summary'),
  jobId: int('job_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
