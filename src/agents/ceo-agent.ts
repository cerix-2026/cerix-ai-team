import { BaseAgent } from './base-agent';
import { ResearchAgent } from './research-agent';
import { LeadGenAgent } from './leadgen-agent';
import { ContentAgent } from './content-agent';
import { FinanceAgent } from './finance-agent';
import { AgentResult, AgentTask, AgentName, DelegationPlan } from '../types';
import { getDb } from '../database';
import { jobs } from '../database/schema';
import { eq } from 'drizzle-orm';

export class CEOAgent extends BaseAgent {
  private agents: Record<string, BaseAgent>;

  constructor() {
    super('ceo', `Du er CeriX CEO Agent - den overordnede orkestrator for hele AI Business Team.

Dit job er at:
1. Analysere indkommende opgaver og beslutte hvilke subagenter der skal bruges
2. Nedbryde komplekse opgaver i deleopgaver
3. Delegere til de rigtige agenter
4. Koordinere resultater og levere samlet output

Dine subagenter:
- research: Research Agent - søger markedsdata, konkurrenter, trends
- leadgen: Lead Generation Agent - finder og kvalificerer B2B leads
- content: Content & Outreach Agent - skriver emails, content, LinkedIn
- finance: Finance & KPI Agent - tracker revenue, costs, KPI'er

Du analyserer altid opgaven først og laver en delegationsplan.
Du skriver på dansk og er strategisk, effektiv og resultatdrevet.

Når du delegerer, vælg den/de agenter der bedst matcher opgaven.
For komplekse opgaver, brug flere agenter i sekvens.`);

    this.agents = {
      research: new ResearchAgent(),
      leadgen: new LeadGenAgent(),
      content: new ContentAgent(),
      finance: new FinanceAgent(),
    };
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    await this.log('ceo_task_received', `Ny opgave modtaget: ${task.title}`, task.id);

    try {
      // Save job to database
      const db = getDb();
      const [jobRecord] = await db.insert(jobs).values({
        title: task.title,
        description: task.description,
        assignedAgent: 'ceo',
        status: 'in_progress',
        priority: task.priority,
        input: task.input || null,
      });
      const jobId = jobRecord.insertId;

      // Step 1: Analyze task and create delegation plan
      await this.log('ceo_analyzing', 'Analyserer opgave og planlægger delegering...', jobId);

      const planPrompt = `Analysér denne opgave og lav en delegationsplan:

Opgave: ${task.title}
Beskrivelse: ${task.description}
Prioritet: ${task.priority}
${task.input ? `Ekstra kontekst: ${JSON.stringify(task.input)}` : ''}

Tilgængelige agenter:
- research: Til markedsanalyse, konkurrentresearch, trends
- leadgen: Til at finde og kvalificere B2B leads
- content: Til at skrive emails, content, LinkedIn beskeder
- finance: Til KPI-rapporter, revenue tracking, financial insights

Svar i JSON format:
{
  "strategy": "Din overordnede strategi for at løse opgaven",
  "subtasks": [
    {
      "agent": "agent_name",
      "title": "Delopgave titel",
      "description": "Hvad agenten skal gøre",
      "priority": "high"
    }
  ]
}`;

      const planResponse = await this.chat(planPrompt);
      let plan: DelegationPlan;

      try {
        const jsonMatch = planResponse.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        plan = {
          strategy: parsed?.strategy || 'Direkte delegering',
          subtasks: (parsed?.subtasks || []).map((st: any) => ({
            agent: st.agent as AgentName,
            task: {
              title: st.title,
              description: st.description,
              priority: st.priority || task.priority,
              input: task.input,
            },
          })),
        };
      } catch {
        // Fallback: delegate to research agent
        plan = {
          strategy: 'Fallback til research agent',
          subtasks: [{
            agent: 'research',
            task: {
              title: task.title,
              description: task.description,
              priority: task.priority,
              input: task.input,
            },
          }],
        };
      }

      await this.log('ceo_plan_ready', `Strategi: ${plan.strategy} | ${plan.subtasks.length} delopgaver`, jobId);

      // Step 2: Execute subtasks
      const results: AgentResult[] = [];

      for (const subtask of plan.subtasks) {
        const agent = this.agents[subtask.agent];
        if (!agent) {
          await this.log('ceo_agent_not_found', `Agent "${subtask.agent}" ikke fundet, springer over`, jobId, 'warning');
          continue;
        }

        // Create sub-job
        const [subJobRecord] = await db.insert(jobs).values({
          title: subtask.task.title,
          description: subtask.task.description,
          assignedAgent: subtask.agent as any,
          status: 'in_progress',
          priority: subtask.task.priority,
          input: subtask.task.input || null,
          parentJobId: jobId,
        });
        const subJobId = subJobRecord.insertId;

        subtask.task.id = subJobId;

        await this.log('ceo_delegating', `Delegerer til ${subtask.agent}: ${subtask.task.title}`, jobId);

        const result = await agent.execute(subtask.task);
        results.push(result);

        // Update sub-job status
        await db.update(jobs)
          .set({
            status: result.success ? 'completed' : 'failed',
            output: result.output,
            completedAt: new Date(),
          })
          .where(eq(jobs.id, subJobId));
      }

      // Step 3: Synthesize results
      const allSuccessful = results.every(r => r.success);
      const synthesisPrompt = `Opsummér resultaterne fra dine subagenter:

Opgave: ${task.title}
Strategi: ${plan.strategy}

Resultater:
${results.map(r => `- ${r.agent} (${r.success ? 'SUCCESS' : 'FEJL'}): ${JSON.stringify(r.output).slice(0, 500)}`).join('\n')}

Giv en samlet konklusion og næste skridt. Svar i JSON:
{
  "summary": "Samlet opsummering",
  "keyFindings": ["fund1", "fund2"],
  "nextSteps": ["skridt1", "skridt2"],
  "overallStatus": "success/partial/failed"
}`;

      const synthesisResponse = await this.chat(synthesisPrompt);
      let synthesis;
      try {
        const jsonMatch = synthesisResponse.match(/\{[\s\S]*\}/);
        synthesis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: synthesisResponse };
      } catch {
        synthesis = { summary: synthesisResponse };
      }

      // Update main job
      await db.update(jobs)
        .set({
          status: allSuccessful ? 'completed' : 'failed',
          output: { plan, results: results.map(r => ({ agent: r.agent, success: r.success })), synthesis },
          completedAt: new Date(),
        })
        .where(eq(jobs.id, jobId));

      await this.log('ceo_task_complete', `Opgave afsluttet: ${task.title} (${results.length} delopgaver)`, jobId, allSuccessful ? 'success' : 'warning');

      return {
        success: allSuccessful,
        agent: 'ceo',
        taskTitle: task.title,
        output: {
          strategy: plan.strategy,
          subtaskResults: results,
          synthesis,
        },
        duration: Date.now() - start,
      };
    } catch (error: any) {
      await this.log('ceo_error', error.message, task.id, 'error');
      return {
        success: false,
        agent: 'ceo',
        taskTitle: task.title,
        output: null,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }
}
