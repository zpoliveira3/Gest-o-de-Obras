
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, TrendingUp, Plus, Trash2, BrainCircuit, DollarSign, 
  BarChart3, X, Loader2, Save, FileUp, ShieldCheck, 
  LogOut, KeyRound, Building2, TrendingDown, Briefcase, 
  Coins, Receipt, RefreshCw, MapPin, PieChart as PieIcon, Users, UserPlus, Shield,
  Calculator, Percent, Landmark, Calendar, FileText, Filter, List, CheckCircle, Clock, Edit2, FileStack, HardHat, Package, Wrench, Zap, AlertCircle, Download, UploadCloud, Target, Menu
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Project, ExpenseCategory, AuthState, User, UserRole, Revenue, Expense } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials } from './services/geminiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('erp_obras_auth_v3');
    return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '' };
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'ai' | 'analytics' | 'team' | 'reports'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Taxas Globais para o Painel
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(() => {
    const saved = localStorage.getItem('erp_global_tax_v3');
    return saved ? Number(saved) : 5;
  });
  const [globalCommRate, setGlobalCommRate] = useState<number>(() => {
    const saved = localStorage.getItem('erp_global_comm_v3');
    return saved ? Number(saved) : 10;
  });

  // States para Formulários
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projTax, setProjTax] = useState('0');
  const [projCommission, setProjCommission] = useState('0');
  const [projLocation, setProjLocation] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);

  // Transaction Modal Extended States
  const [transactionModal, setTransactionModal] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    transactionId: string | null;
    convertingPlannedId: string | null;
    type: 'expense' | 'revenue' | 'planned_revenue' 
  }>({
    isOpen: false, projectId: null, transactionId: null, convertingPlannedId: null, type: 'expense'
  });

  // Campos Unificados
  const [formDesc, setFormDesc] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formDateInput, setFormDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [formVal, setFormVal] = useState('');
  const [formCat, setFormCat] = useState<ExpenseCategory>('Material');

  // Campos Específicos de Custos
  const [costAmounts, setCostAmounts] = useState<{
    'Mão de Obra': string;
    'Material': string;
    'Serviços de Terceiros': string;
    'Outras Despesas': string;
  }>({
    'Mão de Obra': '',
    'Material': '',
    'Serviços de Terceiros': '',
    'Outras Despesas': '',
  });

  const [loginCompany, setLoginCompany] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [reportFilterProject, setReportFilterProject] = useState<string>('all');
  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem('erp_obras_auth_v3', JSON.stringify(auth));
      const savedProjects = localStorage.getItem(`erp_data_${auth.companyKey}`);
      if (savedProjects) setProjects(JSON.parse(savedProjects));
      const savedUsers = localStorage.getItem(`erp_users_${auth.companyKey}`);
      if (savedUsers) setCompanyUsers(JSON.parse(savedUsers));
    }
  }, [auth.isLoggedIn, auth.companyKey]);

  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem(`erp_data_${auth.companyKey}`, JSON.stringify(projects));
      localStorage.setItem(`erp_users_${auth.companyKey}`, JSON.stringify(companyUsers));
      localStorage.setItem('erp_global_tax_v3', globalTaxRate.toString());
      localStorage.setItem('erp_global_comm_v3', globalCommRate.toString());
    }
  }, [projects, companyUsers, auth, globalTaxRate, globalCommRate]);

  // Funções de Autenticação
  const handleLogout = () => {
    localStorage.removeItem('erp_obras_auth_v3');
    setAuth({ isLoggedIn: false, companyName: '', companyKey: '' });
    setActiveView('dashboard');
    setIsSidebarOpen(false);
  };

  // Funcionalidade de Backup
  const exportData = () => {
    const data = {
      projects,
      companyUsers,
      auth,
      globalTaxRate,
      globalCommRate,
      exportDate: new Date().toISOString(),
      version: '3.1'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_obras_${auth.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Atenção: A importação irá substituir todos os dados atuais no seu navegador. Deseja continuar?")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.projects && Array.isArray(json.projects)) {
          setProjects(json.projects);
          if (json.companyUsers) setCompanyUsers(json.companyUsers);
          if (json.auth) setAuth(json.auth);
          if (json.globalTaxRate) setGlobalTaxRate(json.globalTaxRate);
          if (json.globalCommRate) setGlobalCommRate(json.globalCommRate);
          alert("Backup restaurado com sucesso!");
        } else {
          alert("Arquivo de backup inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const companyID = loginCompany.toLowerCase().trim().replace(/\s+/g, '_');
    const storedUsers = localStorage.getItem(`erp_users_${companyID}`);
    const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

    if (users.length === 0) {
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: loginUsername.toLowerCase().trim(),
        password: loginPassword,
        fullName: 'Administrador Master',
        role: 'admin'
      };
      const updatedUsers = [adminUser];
      localStorage.setItem(`erp_users_${companyID}`, JSON.stringify(updatedUsers));
      setAuth({ isLoggedIn: true, companyName: loginCompany, companyKey: companyID, currentUser: adminUser });
      setCompanyUsers(updatedUsers);
      return;
    }

    const foundUser = users.find(u => u.username === loginUsername.toLowerCase().trim() && u.password === loginPassword);
    if (foundUser) {
      setAuth({ isLoggedIn: true, companyName: loginCompany, companyKey: companyID, currentUser: foundUser });
      setCompanyUsers(users);
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectId) {
      setProjects(projects.map(p => p.id === editingProjectId ? {
        ...p, name: projName, client: projClient, budget: Number(projBudget),
        taxPercentage: Number(projTax), commissionPercentage: Number(projCommission),
        startDate: projDate, location: projLocation
      } : p));
    } else {
      const newP: Project = {
        id: crypto.randomUUID(), name: projName, client: projClient, budget: Number(projBudget),
        taxPercentage: Number(projTax), commissionPercentage: Number(projCommission),
        startDate: projDate, location: projLocation, status: 'Em Execução', 
        expenses: [], revenues: [], plannedRevenues: []
      };
      setProjects([...projects, newP]);
    }
    setIsProjectModalOpen(false);
    setEditingProjectId(null);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setProjects(projects.map(p => {
      if (p.id !== transactionModal.projectId) return p;
      
      const isExpense = transactionModal.type === 'expense';
      const timestamp = new Date().toISOString();

      if (transactionModal.type === 'revenue' && transactionModal.convertingPlannedId) {
        const itemData = {
          id: crypto.randomUUID(),
          description: formDesc,
          amount: Number(formVal),
          date: formDateInput,
          createdAt: timestamp,
          createdBy: auth.currentUser?.fullName 
        };
        return {
          ...p,
          plannedRevenues: p.plannedRevenues.filter(r => r.id !== transactionModal.convertingPlannedId),
          revenues: [...p.revenues, itemData]
        };
      }

      if (isExpense && !transactionModal.transactionId) {
        const newExpenses: Expense[] = Object.entries(costAmounts)
          .filter(([_, val]) => Number(val) > 0)
          .map(([cat, val]) => ({
            id: crypto.randomUUID(),
            description: formDesc || `Lançamento de ${cat}`,
            amount: Number(val),
            date: formDateInput,
            category: cat as ExpenseCategory,
            createdAt: timestamp,
            createdBy: auth.currentUser?.fullName
          }));
        
        if (newExpenses.length === 0 && Number(formVal) > 0) {
            newExpenses.push({
                id: crypto.randomUUID(),
                description: formDesc,
                amount: Number(formVal),
                date: formDateInput,
                category: formCat,
                createdAt: timestamp,
                createdBy: auth.currentUser?.fullName
            });
        }
        return { ...p, expenses: [...p.expenses, ...newExpenses] };
      }

      const updateList = (list: any[]) => {
        const itemData = {
          description: formDesc,
          amount: Number(formVal),
          date: formDateInput,
          category: formCat 
        };

        if (transactionModal.transactionId) {
          return list.map(item => item.id === transactionModal.transactionId ? { ...item, ...itemData } : item);
        }
        
        return [...list, { 
          id: crypto.randomUUID(), 
          ...itemData, 
          createdAt: timestamp,
          createdBy: auth.currentUser?.fullName 
        }];
      };

      if (transactionModal.type === 'expense') return { ...p, expenses: updateList(p.expenses) };
      if (transactionModal.type === 'revenue') return { ...p, revenues: updateList(p.revenues) };
      return { ...p, plannedRevenues: updateList(p.plannedRevenues) };
    }));
    
    setTransactionModal({ isOpen: false, projectId: null, transactionId: null, convertingPlannedId: null, type: 'expense' });
    resetTransactionForm();
  };

  const resetTransactionForm = () => {
    setFormDesc(''); setFormDoc(''); setFormVal('');
    setFormDateInput(new Date().toISOString().split('T')[0]);
    setFormCat('Material');
    setCostAmounts({
      'Mão de Obra': '',
      'Material': '',
      'Serviços de Terceiros': '',
      'Outras Despesas': '',
    });
  };

  const openTransactionEdit = (projectId: string, type: 'expense' | 'revenue' | 'planned_revenue', id: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    let item: any;
    if (type === 'expense') item = project.expenses.find(e => e.id === id);
    else if (type === 'revenue') item = project.revenues.find(r => r.id === id);
    else item = project.plannedRevenues.find(r => r.id === id);

    if (item) {
      setFormDesc(item.description);
      setFormVal(item.amount.toString());
      setFormDateInput(item.date);
      setFormCat(item.category || 'Material');
      setTransactionModal({ isOpen: true, projectId, transactionId: id, convertingPlannedId: null, type });
    }
  };

  const handleMarkAsPaid = (projectId: string, revenueId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const planned = project.plannedRevenues.find(r => r.id === revenueId);
    if (!planned) return;

    setFormDesc(planned.description);
    setFormVal(planned.amount.toString());
    setFormDateInput(new Date().toISOString().split('T')[0]);
    setTransactionModal({
      isOpen: true,
      projectId,
      transactionId: null,
      convertingPlannedId: revenueId,
      type: 'revenue'
    });
  };

  const summary = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + p.revenues.reduce((rs, r) => rs + r.amount, 0), 0);
    const expenses = projects.reduce((s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0);
    const budget = projects.reduce((s, p) => s + p.budget, 0);
    const plannedRevenue = projects.reduce((s, p) => s + (p.plannedRevenues?.reduce((rs, r) => rs + r.amount, 0) || 0), 0);
    
    const totalTaxes = revenue * (globalTaxRate / 100);
    const totalCommissions = (revenue - totalTaxes) * (globalCommRate / 100);
    
    const projectedTaxes = budget * (globalTaxRate / 100);
    const projectedCommissions = (budget - projectedTaxes) * (globalCommRate / 100);

    return { 
      budget, revenue, expenses, plannedRevenue,
      taxes: totalTaxes, commissions: totalCommissions,
      currentProfit: revenue - (expenses + totalTaxes + totalCommissions),
      plannedProfit: budget - (expenses + projectedTaxes + projectedCommissions)
    };
  }, [projects, globalTaxRate, globalCommRate]);

  const allExpensesSorted = useMemo(() => {
    let list = projects.flatMap(p => p.expenses.map(e => ({ ...e, projectName: p.name, projectId: p.id })));
    if (reportFilterProject !== 'all') list = list.filter(e => e.projectId === reportFilterProject);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projects, reportFilterProject]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!auth.isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e293b_0%,#020617_100%)] opacity-50"></div>
        <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex p-5 bg-blue-600 rounded-[2rem] mb-6 shadow-2xl shadow-blue-600/20"><ShieldCheck size={48} className="text-white" /></div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Portal Corporativo</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">ERP de Engenharia e Obras</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black uppercase text-center rounded-2xl">{loginError}</div>}
            <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Empresa" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            <input required value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Usuário" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            <input required type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Senha" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase shadow-xl transition-all">Acessar Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden text-slate-900 font-inter">
      {/* Sidebar - Mobile Responsive */}
      <aside className={`fixed inset-y-0 left-0 w-80 bg-slate-900 text-white flex flex-col z-[60] shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl"><Building2 size={24} /></div>
            <h1 className="text-xl font-black uppercase tracking-tighter">ERP<span className="text-blue-500">OBRAS</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        <nav className="p-8 space-y-2 flex-1 overflow-y-auto">
          <button onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Painel de Controle
          </button>
          <button onClick={() => { setActiveView('projects'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Briefcase size={20} /> Obras e Projetos
          </button>
          <button onClick={() => { setActiveView('reports'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FileText size={20} /> Extrato de Caixa
          </button>
          <button onClick={() => { setActiveView('ai'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'ai' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BrainCircuit size={20} /> Auditor de IA
          </button>
        </nav>
        
        <div className="p-8 border-t border-slate-800 space-y-3">
           <div className="flex gap-2">
             <button onClick={exportData} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[9px] font-black uppercase transition-all" title="Baixar todos os dados"><Download size={14}/> Exportar</button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[9px] font-black uppercase transition-all" title="Restaurar de um arquivo"><UploadCloud size={14}/> Importar</button>
           </div>
           <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
           <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase transition-all"><LogOut size={18} /> Sair do Sistema</button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-sm animate-in fade-in duration-300"></div>}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 md:h-24 bg-white border-b border-slate-200 px-6 md:px-12 flex items-center justify-between z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden"><Menu size={24}/></button>
            <h2 className="font-black text-slate-900 uppercase text-xs md:text-lg truncate max-w-[150px] md:max-w-none">
              {auth.companyName} <span className="hidden md:inline text-slate-300 mx-2">|</span> <span className="text-blue-600 font-bold">{auth.currentUser?.fullName}</span>
            </h2>
          </div>
          <div className="text-[9px] md:text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 md:px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2 shadow-sm shrink-0">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse"></div> <span className="hidden sm:inline">Sistema</span> Local Ativo
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50/50">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
              {/* Barra de Configuração de Taxas Globais */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <Calculator size={24} className="text-blue-600" />
                    <h3 className="text-xs font-black uppercase text-slate-800">Parâmetros de Cálculo</h3>
                 </div>
                 <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 group focus-within:border-blue-500 transition-all">
                       <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Percent size={12}/> Imposto:</label>
                       <input 
                         type="number" 
                         value={globalTaxRate} 
                         onChange={e => setGlobalTaxRate(Number(e.target.value))} 
                         className="w-10 md:w-12 bg-transparent font-black text-blue-600 outline-none text-center"
                       />
                       <span className="text-blue-600 font-black">%</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 group focus-within:border-emerald-500 transition-all">
                       <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Coins size={12}/> Comissão:</label>
                       <input 
                         type="number" 
                         value={globalCommRate} 
                         onChange={e => setGlobalCommRate(Number(e.target.value))} 
                         className="w-10 md:w-12 bg-transparent font-black text-emerald-600 outline-none text-center"
                       />
                       <span className="text-emerald-600 font-black">%</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Contratos" value={formatBRL(summary.budget)} icon={<DollarSign size={20}/>} />
                <StatCard title="Receita Real" value={formatBRL(summary.revenue)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-emerald-500" />
                <StatCard title="Custos Totais" value={formatBRL(summary.expenses)} icon={<TrendingDown size={20}/>} colorClass="bg-white border-l-4 border-rose-500" />
                <StatCard title="Lucro Líquido" value={formatBRL(summary.currentProfit)} icon={<Coins size={20}/>} colorClass="bg-slate-900 text-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <StatCard title="Lucro Previsto" value={formatBRL(summary.plannedProfit)} icon={<Target size={20}/>} colorClass="bg-white border-l-4 border-blue-500" />
                <StatCard title="Imposto Pago" value={formatBRL(summary.taxes)} icon={<Landmark size={20}/>} colorClass="bg-white border-l-4 border-amber-500" />
                <StatCard title="Comissão Paga" value={formatBRL(summary.commissions)} icon={<Users size={20}/>} colorClass="bg-white border-l-4 border-indigo-500" />
              </div>

              <div className="bg-indigo-600/10 border border-indigo-200 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                 <div className="flex flex-col md:flex-row items-center gap-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl text-white"><ShieldCheck size={24}/></div>
                   <div>
                     <p className="font-black text-indigo-900 uppercase text-xs">Proteção de Dados</p>
                     <p className="text-indigo-700 text-[10px] font-medium mt-1">Seus dados estão seguros neste navegador. Use a opção "Exportar Backup" para salvar no seu PC ou GitHub.</p>
                   </div>
                 </div>
                 <button onClick={exportData} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Baixar Backup Agora</button>
              </div>
            </div>
          )}

          {activeView === 'projects' && (
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-10">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-2xl md:text-3xl font-black uppercase text-slate-800 tracking-tighter">Obras e Medições</h3>
                  <button onClick={() => { setEditingProjectId(null); setIsProjectModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-3"><Plus size={20} /> Nova Obra</button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {projects.map(p => (
                    <div key={p.id} className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 p-6 md:p-10 shadow-lg relative overflow-hidden flex flex-col border-t-8 border-t-blue-600 transition-all hover:shadow-2xl">
                       <div className="absolute top-6 right-6 md:top-8 md:right-8 flex gap-2">
                          <button onClick={() => { setEditingProjectId(p.id); setProjName(p.name); setProjClient(p.client); setProjBudget(p.budget.toString()); setProjTax(p.taxPercentage.toString()); setProjCommission(p.commissionPercentage.toString()); setProjLocation(p.location || ''); setProjDate(p.startDate); setIsProjectModalOpen(true); }} className="p-2 md:p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => { if(window.confirm('Excluir obra permanentemente?')) setProjects(projects.filter(proj => proj.id !== p.id)) }} className="p-2 md:p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                       </div>
                       <div className="flex-1 mt-4 md:mt-0">
                          <h4 className="font-black text-lg md:text-2xl uppercase mb-1 text-slate-800 truncate pr-16">{p.name}</h4>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2"><MapPin size={12} /> {p.location || 'Local indefinido'}</p>
                          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                             <div className="p-4 md:p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Custo Acumulado</p>
                                <p className="font-black text-rose-600 text-sm md:text-lg">{formatBRL(p.expenses.reduce((s, e) => s + e.amount, 0))}</p>
                             </div>
                             <div className="p-4 md:p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <p className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase mb-1">Medição Real</p>
                                <p className="font-black text-emerald-700 text-sm md:text-lg">{formatBRL(p.revenues.reduce((s, r) => s + r.amount, 0))}</p>
                             </div>
                          </div>
                          <div className="bg-blue-50/50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 mb-6 md:mb-8 border border-blue-100">
                             <h5 className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 flex items-center gap-2 mb-4"><Clock size={14} /> Cronograma de Medições</h5>
                             <div className="space-y-2">
                                {p.plannedRevenues?.map(rev => (
                                   <div key={rev.id} className="bg-white p-3 md:p-4 rounded-2xl shadow-sm flex items-center justify-between border border-blue-100">
                                      <p className="font-black text-slate-800 text-[10px] md:text-xs truncate max-w-[120px] md:max-w-none">{formatBRL(rev.amount)} <span className="hidden sm:inline text-slate-400 font-bold ml-2">| {rev.description}</span></p>
                                      <div className="flex gap-1 md:gap-2 shrink-0">
                                        <button onClick={() => handleMarkAsPaid(p.id, rev.id)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all" title="Corrigir e Receber"><CheckCircle size={14} /></button>
                                        <button onClick={() => openTransactionEdit(p.id, 'planned_revenue', rev.id)} className="p-2 text-slate-300 hover:text-blue-600"><Edit2 size={14} /></button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                          <button onClick={() => { resetTransactionForm(); setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, convertingPlannedId: null, type: 'expense' }); }} className="py-3 md:py-4 bg-slate-900 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Lançar Custos</button>
                          <button onClick={() => { resetTransactionForm(); setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, convertingPlannedId: null, type: 'revenue' }); }} className="py-3 md:py-4 bg-emerald-600 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Lançar Receita</button>
                          <button onClick={() => { resetTransactionForm(); setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, convertingPlannedId: null, type: 'planned_revenue' }); }} className="py-3 md:py-4 bg-blue-600 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Lançar Previsto</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeView === 'reports' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-700 pb-20">
               <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <h3 className="text-2xl md:text-3xl font-black uppercase text-slate-800 tracking-tighter">Fluxo de Caixa</h3>
                  <select value={reportFilterProject} onChange={e => setReportFilterProject(e.target.value)} className="bg-white border border-slate-200 p-4 rounded-xl font-black text-[10px] uppercase outline-none shadow-sm w-full md:w-auto">
                    <option value="all">Filtro: Todas as Obras</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
               <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 overflow-x-auto shadow-2xl">
                  <table className="w-full text-left min-w-[600px] md:min-w-[800px]">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-6 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                           <th className="px-6 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Obra / Descrição</th>
                           <th className="px-6 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoria</th>
                           <th className="px-6 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                           <th className="px-6 md:px-10 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {allExpensesSorted.map(e => (
                           <tr key={e.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-6 md:px-10 py-4 md:py-6 font-black text-slate-600 text-[10px] md:text-xs">{new Date(e.date).toLocaleDateString()}</td>
                              <td className="px-6 md:px-10 py-4 md:py-6"><p className="font-black text-slate-900 text-[10px] md:text-xs uppercase truncate max-w-[200px]">{e.projectName}</p><p className="text-[8px] md:text-[10px] text-slate-400 font-bold italic truncate max-w-[200px]">{e.description}</p></td>
                              <td className="px-6 md:px-10 py-4 md:py-6"><span className="px-2 md:px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[8px] md:text-[9px] font-black uppercase">{e.category}</span></td>
                              <td className="px-6 md:px-10 py-4 md:py-6 text-right font-black text-rose-600 text-[10px] md:text-sm">{formatBRL(e.amount)}</td>
                              <td className="px-6 md:px-10 py-4 md:py-6 text-center">
                                 <button onClick={() => openTransactionEdit(e.projectId, 'expense', e.id)} className="p-2 text-slate-300 hover:text-blue-600 group-hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={12} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="max-w-4xl mx-auto p-6 md:p-12 bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl md:text-2xl font-black uppercase">Auditoria de Inteligência</h3>
                  <button onClick={async () => { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }} className="p-3 md:p-4 bg-slate-100 rounded-2xl active:rotate-180 transition-all duration-500"><RefreshCw size={24} className={isAiLoading ? 'animate-spin' : ''} /></button>
               </div>
               <div className="bg-slate-50 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] prose prose-slate max-w-none min-h-[300px] flex items-center justify-center">
                 {isAiLoading ? <Loader2 size={40} className="animate-spin text-blue-600" /> : <div className="w-full text-slate-700 whitespace-pre-wrap font-medium leading-relaxed text-sm md:text-base">{aiReport || "Inicie a análise para auditoria profissional dos seus lucros e gastos."}</div>}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: OBRA */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 md:p-8">
           <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-6 md:p-8 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight">{editingProjectId ? 'Configurar Obra' : 'Nova Obra'}</h3>
                 <button onClick={() => setIsProjectModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveProject} className="p-6 md:p-8 space-y-4 md:space-y-6 max-h-[70vh] overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input required placeholder="Identificação da Obra" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                    <input required placeholder="Cliente Contratante" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                 </div>
                 <input placeholder="Endereço / Local" value={projLocation} onChange={e => setProjLocation(e.target.value)} className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Budget Total</label><input required type="number" step="0.01" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">ISS/Taxa %</label><input required type="number" step="0.01" value={projTax} onChange={e => setProjTax(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Comissão %</label><input required type="number" step="0.01" value={projCommission} onChange={e => setProjCommission(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" /></div>
                 </div>
                 <button type="submit" className="w-full py-5 md:py-6 bg-blue-600 text-white font-black rounded-3xl uppercase shadow-xl flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-95"><Save size={20} /> Confirmar Cadastro</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO DE CUSTOS */}
      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in-95 duration-300 border border-white/20 overflow-hidden">
               <div className={`p-6 md:p-8 text-white flex justify-between items-center ${
                 transactionModal.convertingPlannedId ? 'bg-indigo-600' :
                 transactionModal.type === 'expense' ? 'bg-slate-900' : 
                 transactionModal.type === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'
               }`}>
                  <div className="flex items-center gap-4">
                     {transactionModal.convertingPlannedId ? <RefreshCw size={24} className="animate-spin-slow" /> : 
                      transactionModal.type === 'expense' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                     <div>
                        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight">
                           {transactionModal.convertingPlannedId ? 'Receber Medição' :
                            transactionModal.transactionId ? 'Ajustar Registro' : 
                            transactionModal.type === 'expense' ? 'Lançamento de Custos' : 
                            transactionModal.type === 'revenue' ? 'Lançar Receita' : 'Lançar Previsto'}
                        </h3>
                     </div>
                  </div>
                  <button onClick={() => { setTransactionModal({ isOpen: false, projectId: null, transactionId: null, convertingPlannedId: null, type: 'expense' }); resetTransactionForm(); }} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
               </div>

               <form onSubmit={handleSaveTransaction} className="p-6 md:p-8 space-y-4 md:space-y-6 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-4 flex items-center gap-2"><Calendar size={12} /> Data da Operação</label>
                      <input required type="date" value={formDateInput} onChange={e => setFormDateInput(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-4 flex items-center gap-2"><FileStack size={12} /> Documento (NF/Recibo)</label>
                      <input placeholder="Opcional" value={formDoc} onChange={e => setFormDoc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Descrição do Lançamento</label>
                    <input required placeholder="Ex: Medição Semanal Obras" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                  </div>

                  {transactionModal.type === 'expense' && !transactionModal.transactionId ? (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-black uppercase text-slate-500 mb-2 px-4">Valores Discriminados</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 group focus-within:border-blue-500 transition-all">
                          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl group-focus-within:bg-blue-600 group-focus-within:text-white transition-all"><HardHat size={18}/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Mão de Obra</p>
                            <input type="number" step="0.01" placeholder="R$ 0,00" value={costAmounts['Mão de Obra']} onChange={e => setCostAmounts({...costAmounts, 'Mão de Obra': e.target.value})} className="bg-transparent font-black text-sm md:text-lg w-full outline-none" />
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 group focus-within:border-blue-500 transition-all">
                          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-focus-within:bg-emerald-600 group-focus-within:text-white transition-all"><Package size={18}/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Material</p>
                            <input type="number" step="0.01" placeholder="R$ 0,00" value={costAmounts['Material']} onChange={e => setCostAmounts({...costAmounts, 'Material': e.target.value})} className="bg-transparent font-black text-sm md:text-lg w-full outline-none" />
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 group focus-within:border-blue-500 transition-all">
                          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all"><Users size={18}/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Serviços de Terceiros</p>
                            <input type="number" step="0.01" placeholder="R$ 0,00" value={costAmounts['Serviços de Terceiros']} onChange={e => setCostAmounts({...costAmounts, 'Serviços de Terceiros': e.target.value})} className="bg-transparent font-black text-sm md:text-lg w-full outline-none" />
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 group focus-within:border-blue-500 transition-all">
                          <div className="p-2.5 bg-slate-200 text-slate-600 rounded-xl group-focus-within:bg-slate-800 group-focus-within:text-white transition-all"><Receipt size={18}/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Outras Despesas</p>
                            <input type="number" step="0.01" placeholder="R$ 0,00" value={costAmounts['Outras Despesas']} onChange={e => setCostAmounts({...costAmounts, 'Outras Despesas': e.target.value})} className="bg-transparent font-black text-sm md:text-lg w-full outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Valor R$</label>
                        <input required type="number" step="0.01" placeholder="0,00" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl md:text-2xl text-slate-800 focus:border-blue-500 outline-none" />
                      </div>
                      
                      {transactionModal.type === 'expense' && (
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Categoria</label>
                            <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase outline-none text-xs md:text-sm">
                                {['Mão de Obra', 'Material', 'Serviços de Terceiros', 'Outras Despesas', 'Logística', 'Equipamentos', 'Impostos', 'Comissão', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                      )}
                    </div>
                  )}

                  <button type="submit" className={`w-full py-5 md:py-6 text-white font-black rounded-3xl uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 text-xs md:text-sm mt-4 ${
                    transactionModal.convertingPlannedId ? 'bg-indigo-600' :
                    transactionModal.type === 'expense' ? 'bg-slate-900' : 
                    transactionModal.type === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    <Save size={20} /> 
                    {transactionModal.convertingPlannedId ? 'Confirmar Recebimento' :
                     transactionModal.transactionId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
