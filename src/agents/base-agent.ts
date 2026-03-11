import OpenAI from 'openai';
import { config } from '../config/env';
import { getDb } from '../database';
import { agentLogs } from '../database/schema';
import { AgentName, AgentResult, AgentTask } from '../types';

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

  protected async chat(userMessage: string, maxTokens: number = 4096): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config.claudeModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  abstract execute(task: AgentTask): Promise<AgentResult>;
}
