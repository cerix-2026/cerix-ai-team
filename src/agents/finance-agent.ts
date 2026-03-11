import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask } from '../types';
import { getDb } from '../database';
import { revenue, kpiSnapshots, leads, jobs, outreachEmails, agentLogs } from '../database/schema';
import { sql, count, eq, sum } from 'drizzle-orm';

export class FinanceAgent extends BaseAgent {
  constructor() {
    super('finance', `Du er CeriX Finance & KPI Agent - en specialiseret AI til at tracke revenue, costs og KPI'er.

Dit job er at:
1. Beregne og rapportere KPI'er
2. Generere daglige/ugentlige business-rapporter
3. Tracke revenue fra alle tre forretningsben
4. Identificere trends og give financial insights
5. Anbefale optimeringsmuligheder

KPI'er du tracker:
- Total leads / Qualified leads
- Emails sendt / Åbningsrate / Svarrate
- Meetings booked
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Agent task completion rate
- Revenue per forretningsben (AI-Services, SaaS, Leadgen)

Du leverer altid tal, procenter og trends. Du skriver på dansk.`);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    await this.log('finance_start', `Starter finance-opgave: ${task.title}`, task.id);

    try {
      // Gather real data from database
      const db = getDb();

      const [leadStats] = await db.select({
        total: count(),
      }).from(leads);

      const [qualifiedStats] = await db.select({
        total: count(),
      }).from(leads).where(eq(leads.status, 'qualified'));

      const [emailStats] = await db.select({
        total: count(),
      }).from(outreachEmails);

      const [sentEmailStats] = await db.select({
        total: count(),
      }).from(outreachEmails).where(eq(outreachEmails.status, 'sent'));

      const [jobStats] = await db.select({
        total: count(),
      }).from(jobs).where(eq(jobs.status, 'completed'));

      const [revenueStats] = await db.select({
        total: sum(revenue.amount),
      }).from(revenue);

      const realData = {
        totalLeads: leadStats?.total || 0,
        qualifiedLeads: qualifiedStats?.total || 0,
        emailsSent: sentEmailStats?.total || 0,
        totalEmails: emailStats?.total || 0,
        tasksCompleted: jobStats?.total || 0,
        totalRevenue: revenueStats?.total || '0',
      };

      const prompt = `Generer en KPI-rapport baseret på følgende reelle data fra systemet:

Opgave: ${task.title}
Beskrivelse: ${task.description}

AKTUELLE DATA:
- Total leads i systemet: ${realData.totalLeads}
- Kvalificerede leads: ${realData.qualifiedLeads}
- Emails oprettet: ${realData.totalEmails}
- Emails sendt: ${realData.emailsSent}
- Agent-opgaver afsluttet: ${realData.tasksCompleted}
- Total revenue: ${realData.totalRevenue} DKK

${task.input ? `Ekstra kontekst: ${JSON.stringify(task.input)}` : ''}

Generer en rapport i JSON format:
{
  "reportTitle": "Rapport titel",
  "period": "Periode",
  "kpis": {
    "totalLeads": ${realData.totalLeads},
    "qualifiedLeads": ${realData.qualifiedLeads},
    "conversionRate": "X%",
    "emailsSent": ${realData.emailsSent},
    "totalRevenue": "${realData.totalRevenue}",
    "mrr": "beregnet MRR",
    "agentEfficiency": "X%"
  },
  "insights": ["indsigt1", "indsigt2", ...],
  "recommendations": ["anbefaling1", "anbefaling2", ...],
  "trends": "Beskrivelse af trends",
  "fullReport": "Den fulde rapport i markdown"
}`;

      const response = await this.chat(prompt);

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { fullReport: response };
      } catch {
        result = { fullReport: response };
      }

      // Save KPI snapshot
      const today = new Date().toISOString().split('T')[0];
      await db.insert(kpiSnapshots).values({
        date: today,
        totalLeads: realData.totalLeads,
        qualifiedLeads: realData.qualifiedLeads,
        emailsSent: realData.emailsSent,
        monthlyRevenue: realData.totalRevenue || '0',
        agentTasksCompleted: realData.tasksCompleted,
      });

      await this.log('finance_complete', `KPI-rapport genereret: ${task.title}`, task.id, 'success');

      return {
        success: true,
        agent: 'finance',
        taskTitle: task.title,
        output: result,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      await this.log('finance_error', error.message, task.id, 'error');
      return {
        success: false,
        agent: 'finance',
        taskTitle: task.title,
        output: null,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }
}
