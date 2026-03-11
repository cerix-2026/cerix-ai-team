import OpenAI from 'openai';
import { config } from '../config/env';
import { getDb } from '../database';
import { agentLogs } from '../database/schema';
import { AgentName, AgentResult, AgentTask } from '../types';
import { skills } from '../database/schema';
import { eq } from 'drizzle-orm';

export abstract class BaseAgent {
  protected client: OpenAI;
  protected name: AgentName;
  protected systemPrompt: string;

  constructor(name: AgentName, systemPrompt: string) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.openrouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://cerix.dk',
        'X-Title': 'CeriX CEO-AI',
      },
    });
  }

  async log(action: string, details: string, jobId?: number, status: 'info' | 'success' | 'warning' | 'error' = 'info') {
    try {
      const db = getDb();
      await db.insert(agentLogs).values({
        agent: this.name,
        action,
        details,
        jobId: jobId || null,
        status,
      });
    } catch (e) {
      console.error(`[${this.name}] Log error:`, e);
    }
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${this.name.toUpperCase()}] ${action}: ${details}`);
  }

  protected async getSkillPrompts(): Promise<string> {
    try {
      const db = getDb();
      const installedSkills = await db.select().from(skills).where(eq(skills.installed, true));
      const relevantSkills = installedSkills.filter((s: any) => {
        const agents = typeof s.agents === 'string' ? JSON.parse(s.agents) : (s.agents || []);
        return agents.includes(this.name);
      });
      if (relevantSkills.length === 0) return '';
      return '\n\n--- INSTALLEREDE SKILLS ---\n' +
        relevantSkills.map((s: any) => `[${s.name}]: ${s.prompt}`).join('\n\n');
    } catch {
      return '';
    }
  }

  protected async chat(userMessage: string, maxTokens: number = 4096): Promise<string> {
    const skillPrompts = await this.getSkillPrompts();
    const fullSystemPrompt = this.systemPrompt + skillPrompts;

    const response = await this.client.chat.completions.create({
      model: config.claudeModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  // Public conversational chat — for the chat UI
  async chatMessage(userMessage: string): Promise<string> {
    await this.log('chat', `Besked modtaget: ${userMessage.slice(0, 80)}`, undefined, 'info');
    const response = await this.chat(userMessage);
    await this.log('chat_response', `Svar sendt (${response.length} tegn)`, undefined, 'success');
    return response;
  }

  abstract execute(task: AgentTask): Promise<AgentResult>;
}
