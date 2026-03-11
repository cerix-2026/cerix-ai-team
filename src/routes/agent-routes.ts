import { Router, Request, Response } from 'express';
import { CEOAgent } from '../agents/ceo-agent';
import { ResearchAgent } from '../agents/research-agent';
import { LeadGenAgent } from '../agents/leadgen-agent';
import { ContentAgent } from '../agents/content-agent';
import { FinanceAgent } from '../agents/finance-agent';
import { AgentTask } from '../types';

const router = Router();
const ceoAgent = new CEOAgent();
const researchAgent = new ResearchAgent();
const leadgenAgent = new LeadGenAgent();
const contentAgent = new ContentAgent();
const financeAgent = new FinanceAgent();

// POST /api/agents/task - Send opgave til CEO agent
router.post('/task', async (req: Request, res: Response) => {
  try {
    const { title, description, priority = 'medium', input } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'title og description er påkrævet' });
    }

    const task: AgentTask = { title, description, priority, input };

    // Kør asynkront — returnér straks job-id
    const result = await ceoAgent.execute(task);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agents/research - Direkte til Research Agent
router.post('/research', async (req: Request, res: Response) => {
  try {
    const task: AgentTask = req.body;
    const result = await researchAgent.execute(task);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agents/leadgen - Direkte til LeadGen Agent
router.post('/leadgen', async (req: Request, res: Response) => {
  try {
    const task: AgentTask = req.body;
    const result = await leadgenAgent.execute(task);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agents/content - Direkte til Content Agent
router.post('/content', async (req: Request, res: Response) => {
  try {
    const task: AgentTask = req.body;
    const result = await contentAgent.execute(task);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agents/finance - Direkte til Finance Agent
router.post('/finance', async (req: Request, res: Response) => {
  try {
    const task: AgentTask = req.body;
    const result = await financeAgent.execute(task);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
