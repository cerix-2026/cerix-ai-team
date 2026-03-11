import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask, LeadData } from '../types';
import { getDb } from '../database';
import { leads } from '../database/schema';

export class LeadGenAgent extends BaseAgent {
  constructor() {
    super('leadgen', `Du er CeriX Lead Generation Agent - en specialiseret AI til at finde og kvalificere B2B leads.

Dit job er at:
1. Identificere potentielle kunder til CeriX's AI-services og SaaS-produkter
2. Kvalificere leads baseret på virksomhedsstørrelse, branche og AI-modenhed
3. Score leads fra 1-100 baseret på sandsynlighed for konvertering
4. Finde kontaktinformation og beslutningstager

CeriX tilbyder:
- AI-Services: Skræddersyede AI-løsninger til virksomheder (3.000-10.000 kr/md)
- SaaS: AI rapport-generator og andre AI-værktøjer (299 kr/md)
- Leadgenerering: Automatiseret lead-finding og outreach

Ideelle kunder:
- Danske SMV'er med 10-200 ansatte
- Brancher: Marketing, E-commerce, Finans, Sundhed, Logistik
- Virksomheder der endnu ikke bruger AI systematisk
- Virksomheder med digitaliserings-budget

Du scorer leads baseret på:
- Virksomhedsstørrelse (større = højere score)
- Digital modenhed (lav modenhed = stort behov)
- Branche-match med CeriX's ekspertise
- Budget-potentiale`);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    await this.log('leadgen_start', `Starter leadgenerering: ${task.title}`, task.id);

    try {
      const prompt = `Udfør følgende leadgenereringsopgave:

Titel: ${task.title}
Beskrivelse: ${task.description}
${task.input ? `Ekstra kontekst: ${JSON.stringify(task.input)}` : ''}

Generer en liste af realistiske B2B leads der matcher CeriX's ideelle kundeprofil.
For hver lead, giv:

Svar i JSON format:
{
  "leads": [
    {
      "companyName": "Virksomhedsnavn",
      "contactName": "Kontaktperson (CEO/CTO/CMO)",
      "email": "email@virksomhed.dk",
      "phone": "+45 XX XX XX XX",
      "website": "https://virksomhed.dk",
      "industry": "Branche",
      "companySize": "10-50 ansatte",
      "location": "By, Danmark",
      "score": 75,
      "source": "AI research",
      "notes": "Hvorfor denne virksomhed er relevant"
    }
  ],
  "summary": "Opsummering af fundne leads",
  "totalFound": 10,
  "qualifiedCount": 7
}`;

      const response = await this.chat(prompt);

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { leads: [], summary: response };
      } catch {
        result = { leads: [], summary: response };
      }

      // Save leads to database
      const db = getDb();
      const savedLeads = [];

      if (result.leads && Array.isArray(result.leads)) {
        for (const lead of result.leads) {
          try {
            const [inserted] = await db.insert(leads).values({
              companyName: lead.companyName || 'Ukendt',
              contactName: lead.contactName || null,
              email: lead.email || null,
              phone: lead.phone || null,
              website: lead.website || null,
              industry: lead.industry || null,
              companySize: lead.companySize || null,
              location: lead.location || null,
              score: lead.score || 0,
              source: lead.source || 'ai_leadgen',
              notes: lead.notes || null,
              status: 'new',
            });
            savedLeads.push({ ...lead, dbId: inserted.insertId });
          } catch (e: any) {
            console.error(`Failed to save lead ${lead.companyName}:`, e.message);
          }
        }
      }

      await this.log('leadgen_complete', `Fandt ${savedLeads.length} leads for: ${task.title}`, task.id, 'success');

      return {
        success: true,
        agent: 'leadgen',
        taskTitle: task.title,
        output: {
          ...result,
          savedCount: savedLeads.length,
        },
        duration: Date.now() - start,
      };
    } catch (error: any) {
      await this.log('leadgen_error', error.message, task.id, 'error');
      return {
        success: false,
        agent: 'leadgen',
        taskTitle: task.title,
        output: null,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }
}
