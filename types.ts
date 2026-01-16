
export type ExpenseCategory = 'Material' | 'Mão de Obra' | 'Logística' | 'Equipamentos' | 'Impostos' | 'Serviços Terceiros' | 'Comissão' | 'Outros';

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64 string
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // Data da competência (NF/Recibo)
  createdAt: string; // Data real do lançamento no sistema
  category: ExpenseCategory;
  invoiceNumber?: string;
  attachment?: Attachment;
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string; // Data do recebimento/previsão
  createdAt: string; // Data real do lançamento no sistema
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  startDate: string;
  status: 'Em Planejamento' | 'Em Execução' | 'Concluído' | 'Pausado';
  expenses: Expense[];
  revenues: Revenue[]; // Receitas Pagas
  plannedRevenues: Revenue[]; // Receitas Previstas
}

export interface AuthState {
  isLoggedIn: boolean;
  companyName: string;
  companyKey: string;
  userRole: 'admin' | 'editor';
}

export interface SyncStatus {
  lastSync: Date | null;
  state: 'synced' | 'syncing' | 'error' | 'offline';
}
