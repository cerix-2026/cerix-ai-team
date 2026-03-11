import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { leads, jobs, agentLogs, outreachEmails, revenue, kpiSnapshots, researchReports } from '../database/schema';
import { desc, eq, count, sql, sum } from 'drizzle-orm';

const router = Router();

// GET /api/data/leads - Hent alle leads
router.get('/leads', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);
    res.json({ success: true, data: allLeads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/jobs - Hent alle jobs
router.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(50);
    res.json({ success: true, data: allJobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/logs - Hent agent-aktivitetslog
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await db.select().from(agentLogs).orderBy(desc(agentLogs.createdAt)).limit(limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/emails - Hent outreach emails
router.get('/emails', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const emails = await db.select().from(outreachEmails).orderBy(desc(outreachEmails.createdAt)).limit(50);
    res.json({ success: true, data: emails });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/kpi - Hent KPI dashboard data
router.get('/kpi', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const [leadCount] = await db.select({ total: count() }).from(leads);
    const [qualifiedCount] = await db.select({ total: count() }).from(leads).where(eq(leads.status, 'qualified'));
    const [jobCount] = await db.select({ total: count() }).from(jobs).where(eq(jobs.status, 'completed'));
    const [emailCount] = await db.select({ total: count() }).from(outreachEmails);
    const [sentCount] = await db.select({ total: count() }).from(outreachEmails).where(eq(outreachEmails.status, 'sent'));
    const [totalRevenue] = await db.select({ total: sum(revenue.amount) }).from(revenue);

    const recentLogs = await db.select().from(agentLogs).orderBy(desc(agentLogs.createdAt)).limit(10);
    const recentSnapshots = await db.select().from(kpiSnapshots).orderBy(desc(kpiSnapshots.createdAt)).limit(7);

    res.json({
      success: true,
      data: {
        overview: {
          totalLeads: leadCount?.total || 0,
          qualifiedLeads: qualifiedCount?.total || 0,
          completedJobs: jobCount?.total || 0,
          totalEmails: emailCount?.total || 0,
          sentEmails: sentCount?.total || 0,
          totalRevenue: totalRevenue?.total || '0',
        },
        recentActivity: recentLogs,
        kpiHistory: recentSnapshots,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/data/reports - Hent research rapporter
router.get('/reports', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const reports = await db.select().from(researchReports).orderBy(desc(researchReports.createdAt)).limit(20);
    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
