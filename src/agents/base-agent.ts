import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { getDb } from '../database';
import { agentLogs } from '../database/schema';
import { AgentName, AgentResult, AgentTask } from '../types';

export abstract class BaseAgent {
  protected client: Anthropic;
  protected name: AgentName;
  protected systemPrompt: string;

  constructor(name: AgentName, systemPrompt: string) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
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
    const response = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: maxTokens,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  abstract execute(task: AgentTask): Promise<AgentResult>;
}
