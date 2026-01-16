
export type ExpenseCategory = 'Material' | 'Mão de Obra' | 'Logística' | 'Equipamentos' | 'Impostos' | 'Serviços Terceiros' | 'Comissão' | 'Outros';
export type UserRole = 'admin' | 'engenheiro' | 'financeiro' | 'visitante';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  fullName: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  category: ExpenseCategory;
  createdBy?: string; // Nome do usuário que lançou
}

export interface Revenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  createdBy?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  startDate: string;
  location?: string;
  status: 'Em Planejamento' | 'Em Execução' | 'Concluído' | 'Pausado';
  expenses: Expense[];
  revenues: Revenue[];
  plannedRevenues: Revenue[];
}

export interface AuthState {
  isLoggedIn: boolean;
  companyName: string;
  companyKey: string;
  currentUser?: User;
}
