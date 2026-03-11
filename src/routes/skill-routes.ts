import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { skills } from '../database/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/skills - List all skills
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const allSkills = await db.select().from(skills).orderBy(skills.category);
    res.json({ success: true, data: allSkills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/skills/:slug/install - Install a skill
router.post('/:slug/install', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const slug = req.params.slug as string;
    await db.update(skills).set({ installed: true }).where(eq(skills.slug, slug));
    res.json({ success: true, message: `Skill "${slug}" installeret` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/skills/:slug/uninstall - Uninstall a skill
router.post('/:slug/uninstall', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const slug = req.params.slug as string;
    await db.update(skills).set({ installed: false }).where(eq(skills.slug, slug));
    res.json({ success: true, message: `Skill "${slug}" afinstalleret` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/skills/installed - Get installed skills (used by agents)
router.get('/installed', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const installed = await db.select().from(skills).where(eq(skills.installed, true));
    res.json({ success: true, data: installed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
