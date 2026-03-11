// ==================== Agent Types ====================

export type AgentName = 'ceo' | 'research' | 'leadgen' | 'content' | 'finance';

export interface AgentTask {
  id?: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  input?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  agent: AgentName;
  taskTitle: string;
  output: any;
  error?: string;
  duration?: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ==================== Lead Types ====================

export interface LeadData {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  score?: number;
  source?: string;
  notes?: string;
}

// ==================== KPI Types ====================

export interface KPIData {
  totalLeads: number;
  qualifiedLeads: number;
  emailsSent: number;
  emailsOpened: number;
  meetingsBooked: number;
  monthlyRevenue: number;
  activeClients: number;
  agentTasksCompleted: number;
}

// ==================== CEO Delegation ====================

export interface DelegationPlan {
  subtasks: {
    agent: AgentName;
    task: AgentTask;
  }[];
  strategy: string;
}

// ==================== API Response ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
