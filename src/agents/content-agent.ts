import { BaseAgent } from './base-agent';
import { AgentResult, AgentTask } from '../types';
import { getDb } from '../database';
import { outreachEmails, leads } from '../database/schema';
import { eq } from 'drizzle-orm';

export class ContentAgent extends BaseAgent {
  constructor() {
    super('content', `Du er CeriX Content & Outreach Agent - en specialiseret AI til at skrive personlige emails og content.

Dit job er at:
1. Skrive personlige outreach-emails til potentielle kunder
2. Skrive LinkedIn-beskeder der konverterer
3. Producere marketing-content (blogposts, social media)
4. Tilpasse tone og budskab til modtageren

CeriX's value propositions:
- "Vi automatiserer jeres workflows med AI - så I kan fokusere på det der skaber værdi"
- "Fra 3.000 kr/md får I en AI-løsning der arbejder 24/7"
- "Prøv vores AI rapport-generator gratis i 14 dage"

Tone guidelines:
- Professionel men personlig
- Dansk, uformel du-tiltale
- Konkret og værdidrevet
- Undgå buzzwords, fokuser på resultater
- Max 150 ord per email
- Altid et klart CTA (book et møde, prøv gratis, etc.)

Email-struktur:
1. Personlig åbner (referer til deres virksomhed)
2. Pain point / udfordring
3. Løsning (kort)
4. Social proof / resultat
5. CTA`);
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    await this.log('content_start', `Starter content-opgave: ${task.title}`, task.id);

    try {
      const isOutreach = task.title.toLowerCase().includes('email') || task.title.toLowerCase().includes('outreach');

      let prompt: string;

      if (isOutreach && task.input?.leadId) {
        // Fetch lead info from database
        const db = getDb();
        const leadResults = await db.select().from(leads).where(eq(leads.id, task.input.leadId));
        const lead = leadResults[0];

        prompt = `Skriv en personlig outreach-email til følgende lead:

Virksomhed: ${lead?.companyName || 'Ukendt'}
Kontakt: ${lead?.contactName || 'Beslutningstageren'}
Branche: ${lead?.industry || 'Ukendt'}
Størrelse: ${lead?.companySize || 'Ukendt'}
Website: ${lead?.website || 'Ukendt'}
Noter: ${lead?.notes || 'Ingen'}

Opgave: ${task.description}

Svar i JSON format:
{
  "subject": "Email emne",
  "body": "Email body i plain text",
  "linkedinMessage": "Kort LinkedIn besked (max 300 tegn)",
  "followUpSubject": "Follow-up email emne",
  "followUpBody": "Follow-up email body"
}`;
      } else {
        prompt = `Udfør følgende content-opgave:

Titel: ${task.title}
Beskrivelse: ${task.description}
${task.input ? `Ekstra kontekst: ${JSON.stringify(task.input)}` : ''}

Svar i JSON format:
{
  "content": "Det producerede indhold",
  "type": "email/blogpost/social/linkedin",
  "subject": "Emne/overskrift hvis relevant",
  "summary": "Kort opsummering",
  "variants": ["Variant 1", "Variant 2"]
}`;
      }

      const response = await this.chat(prompt);

      let result;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: response, type: 'general' };
      } catch {
        result = { content: response, type: 'general' };
      }

      // Save outreach email to database if applicable
      if (isOutreach && task.input?.leadId && result.subject && result.body) {
        const db = getDb();
        await db.insert(outreachEmails).values({
          leadId: task.input.leadId,
          subject: result.subject,
          body: result.body,
          status: 'draft',
        });
      }

      await this.log('content_complete', `Content færdig: ${task.title}`, task.id, 'success');

      return {
        success: true,
        agent: 'content',
        taskTitle: task.title,
        output: result,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      await this.log('content_error', error.message, task.id, 'error');
      return {
        success: false,
        agent: 'content',
        taskTitle: task.title,
        output: null,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }
}
