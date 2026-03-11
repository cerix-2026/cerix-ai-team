import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask } from '../types';
import { getDb } from '../database';
import { researchReports } from '../database/schema';

export class ResearchAgent extends BaseAgent {
  constructor() {
    super('research', `Du er CeriX Research Agent - en specialiseret AI-forskningsassistent.

Dit job er at:
1. Analysere markeder, brancher og konkurrenter
2. Finde trends og muligheder inden for AI og teknologi
3. Udarbejde research-rapporter med konkrete indsigter
4. Identificere potentielle kundesegmenter for CeriX's AI-services

Du skriver altid på dansk og leverer strukturerede rapporter med:
- Executive summary
- Hovedfund
- Markedsanalyse
- Anbefalinger
- Kilder og data

Du er grundig, datadrevet og fokuserer på actionable insights.`);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    await this.log('research_start', `Starter research: ${task.title}`, task.id);

    try {
      const prompt = `Udfør følgende research-opgave:

Titel: ${task.title}
Beskrivelse: ${task.description}
${task.input ? `Ekstra kontekst: ${JSON.stringify(task.input)}` : ''}

Levér en struktureret research-rapport med:
1. Executive Summary (2-3 sætninger)
2. Hovedfund (5-10 punkter)
3. Markedsanalyse med konkrete tal og trends
4. Konkurrentoversigt hvis relevant
5. Anbefalinger til CeriX
6. Konklusion

Svar i JSON format:
{
  "title": "Rapport titel",
  "summary": "Executive summary",
  "findings": ["fund1", "fund2", ...],
  "marketAnalysis": "Detaljeret markedsanalyse",
  "competitors": [{"name": "...", "strengths": "...", "weaknesses": "..."}],
  "recommendations": ["anbefaling1", "anbefaling2", ...],
  "conclusion": "Samlet konklusion",
  "fullReport": "Den fulde rapport i markdown format"
}`;

      const response = await this.chat(prompt);

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { fullReport: response, title: task.title, summary: response.slice(0, 200) };
      } catch {
        result = { fullReport: response, title: task.title, summary: response.slice(0, 200) };
      }

      // Save report to database
      const db = getDb();
      await db.insert(researchReports).values({
        title: result.title || task.title,
        topic: task.description,
        content: result.fullReport || response,
        summary: result.summary,
        jobId: task.id || null,
      });

      await this.log('research_complete', `Research færdig: ${task.title}`, task.id, 'success');

      return {
        success: true,
        agent: 'research',
        taskTitle: task.title,
        output: result,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      await this.log('research_error', error.message, task.id, 'error');
      return {
        success: false,
        agent: 'research',
        taskTitle: task.title,
        output: null,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }
}
