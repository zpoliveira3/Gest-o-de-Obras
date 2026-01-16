
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, TrendingUp, Plus, Trash2, BrainCircuit, DollarSign, 
  BarChart3, X, Loader2, Save, FileUp, ShieldCheck, 
  LogOut, KeyRound, Building2, TrendingDown, Briefcase, 
  Coins, Receipt, RefreshCw, MapPin, PieChart as PieIcon, Users, UserPlus, Shield,
  Calculator, Percent, Landmark, Calendar, FileText, Filter, List, CheckCircle, Clock, Edit2
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
  
  // Login States
  const [loginCompany, setLoginCompany] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Project States (Add/Edit)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projTax, setProjTax] = useState('0');
  const [projCommission, setProjCommission] = useState('0');
  const [projLocation, setProjLocation] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters for Reports
  const [reportFilterProject, setReportFilterProject] = useState<string>('all');

  // Team Management
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('engenheiro');

  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Transaction Modal State (Add/Edit)
  const [transactionModal, setTransactionModal] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    transactionId: string | null;
    type: 'expense' | 'revenue' | 'planned_revenue' 
  }>({
    isOpen: false, projectId: null, transactionId: null, type: 'expense'
  });
  const [formDesc, setFormDesc] = useState('');
  const [formVal, setFormVal] = useState('');
  const [formDateInput, setFormDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [formCat, setFormCat] = useState<ExpenseCategory>('Material');

  // Carregar dados da empresa logada
  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem('erp_obras_auth_v3', JSON.stringify(auth));
      const savedProjects = localStorage.getItem(`erp_data_${auth.companyKey}`);
      if (savedProjects) setProjects(JSON.parse(savedProjects));
      const savedUsers = localStorage.getItem(`erp_users_${auth.companyKey}`);
      if (savedUsers) setCompanyUsers(JSON.parse(savedUsers));
    }
  }, [auth]);

  // Persistir mudanças
  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem(`erp_data_${auth.companyKey}`, JSON.stringify(projects));
      localStorage.setItem(`erp_users_${auth.companyKey}`, JSON.stringify(companyUsers));
    }
  }, [projects, companyUsers, auth]);

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
      setLoginError('Usuário ou senha incorretos para esta empresa.');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: crypto.randomUUID(),
      username: newUserName.toLowerCase().trim(),
      password: newUserPass,
      fullName: newUserFullName,
      role: newUserRole
    };
    setCompanyUsers([...companyUsers, newUser]);
    setIsAddingUser(false);
    setNewUserName(''); setNewUserFullName(''); setNewUserPass('');
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`ATENÇÃO: Você tem certeza que deseja excluir a obra "${projectName}"? Todos os lançamentos financeiros serão perdidos permanentemente.`)) {
      setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  const openProjectEdit = (p: Project) => {
    setEditingProjectId(p.id);
    setProjName(p.name);
    setProjClient(p.client);
    setProjBudget(p.budget.toString());
    setProjTax(p.taxPercentage.toString());
    setProjCommission(p.commissionPercentage.toString());
    setProjLocation(p.location || '');
    setProjDate(p.startDate);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectId) {
      setProjects(projects.map(p => p.id === editingProjectId ? {
        ...p,
        name: projName,
        client: projClient,
        budget: Number(projBudget),
        taxPercentage: Number(projTax),
        commissionPercentage: Number(projCommission),
        startDate: projDate,
        location: projLocation
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
    setProjName(''); setProjClient(''); setProjBudget(''); setProjTax('0'); setProjCommission('0');
  };

  const handleMarkAsPaid = (projectId: string, revenueId: string) => {
    if (!window.confirm("Deseja confirmar o recebimento desta medição? O valor será contabilizado como receita real.")) return;
    setProjects(projects.map(p => {
      if (p.id !== projectId) return p;
      const planned = p.plannedRevenues.find(r => r.id === revenueId);
      if (!planned) return p;
      const newRevenue: Revenue = {
        ...planned,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      return {
        ...p,
        plannedRevenues: p.plannedRevenues.filter(r => r.id !== revenueId),
        revenues: [...p.revenues, newRevenue]
      };
    }));
  };

  const openTransactionEdit = (projectId: string, type: 'expense' | 'revenue' | 'planned_revenue', id: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    let item;
    if (type === 'expense') item = project.expenses.find(e => e.id === id);
    else if (type === 'revenue') item = project.revenues.find(r => r.id === id);
    else item = project.plannedRevenues.find(r => r.id === id);

    if (item) {
      setFormDesc(item.description);
      setFormVal(item.amount.toString());
      setFormDateInput(item.date);
      if (type === 'expense') setFormCat((item as Expense).category);
      setTransactionModal({ isOpen: true, projectId, transactionId: id, type });
    }
  };

  const summary = useMemo(() => {
    const budget = projects.reduce((s, p) => s + p.budget, 0);
    const revenue = projects.reduce((s, p) => s + p.revenues.reduce((rs, r) => rs + r.amount, 0), 0);
    const plannedRevenue = projects.reduce((s, p) => s + (p.plannedRevenues?.reduce((rs, r) => rs + r.amount, 0) || 0), 0);
    const expenses = projects.reduce((s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0);
    
    let totalTaxes = 0;
    let totalCommissions = 0;

    projects.forEach(p => {
      const pRevenue = p.revenues.reduce((rs, r) => rs + r.amount, 0);
      const pTax = pRevenue * (p.taxPercentage / 100);
      const pCommission = (pRevenue - pTax) * (p.commissionPercentage / 100);
      
      totalTaxes += pTax;
      totalCommissions += pCommission;
    });
    
    const plannedProfit = budget - (expenses + totalTaxes + totalCommissions);
    const currentProfit = revenue - (expenses + totalTaxes + totalCommissions);

    return { 
      budget, revenue, plannedRevenue, expenses, 
      taxes: totalTaxes, 
      commissions: totalCommissions, 
      plannedProfit, currentProfit 
    };
  }, [projects]);

  const allExpensesSorted = useMemo(() => {
    let list = projects.flatMap(p => 
      p.expenses.map(e => ({ ...e, projectName: p.name, projectId: p.id }))
    );
    if (reportFilterProject !== 'all') {
      list = list.filter(e => e.projectId === reportFilterProject);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projects, reportFilterProject]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    projects.forEach(p => p.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    }));
    if (summary.taxes > 0) categories['Impostos (Calc.)'] = summary.taxes;
    if (summary.commissions > 0) categories['Comissões (Calc.)'] = summary.commissions;
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [projects, summary]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,#1e293b_0%,#020617_100%)] opacity-50"></div>
        <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex p-5 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/20 mb-6">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Portal Corporativo</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gestão Centralizada de Obras</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black uppercase text-center rounded-2xl">{loginError}</div>}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">ID da Empresa</label>
              <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Ex: ConstruNova" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Nome de Usuário</label>
              <input required value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="usuario.exemplo" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Senha</label>
              <input required type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase shadow-2xl transition-all mt-4">Entrar no Sistema</button>
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Primeiro acesso cria empresa master</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden font-inter text-slate-900">
      <aside className="w-full md:w-80 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-2xl">
        <div className="p-10 border-b border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl"><Building2 size={24} /></div>
          <h1 className="text-xl font-black uppercase tracking-tighter">ERP<span className="text-blue-500">OBRAS</span></h1>
        </div>
        <div className="px-10 py-6 border-b border-slate-800 bg-slate-800/20">
           <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Logado como</p>
           <p className="font-black text-sm uppercase text-blue-400">{auth.currentUser?.fullName}</p>
           <div className="flex items-center gap-2 mt-1">
              <Shield size={10} className="text-slate-500" />
              <span className="text-[9px] font-black uppercase text-slate-500">{auth.currentUser?.role}</span>
           </div>
        </div>
        <nav className="p-8 space-y-2 flex-1 overflow-y-auto">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Painel de Controle da Obra
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Briefcase size={20} /> Projetos
          </button>
          <button onClick={() => setActiveView('reports')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FileText size={20} /> Relatórios
          </button>
          {auth.currentUser?.role === 'admin' && (
            <button onClick={() => setActiveView('team')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'team' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Users size={20} /> Gestão de Equipe
            </button>
          )}
          <button onClick={() => setActiveView('ai')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'ai' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BrainCircuit size={20} /> Auditor IA
          </button>
        </nav>
        <div className="p-8 border-t border-slate-800">
          <button onClick={() => { localStorage.removeItem('erp_obras_auth_v3'); window.location.reload(); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase">
            <LogOut size={18} /> Sair do Portal
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-200 px-12 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa</h2>
            <p className="font-black text-slate-900 uppercase text-lg">{auth.companyName}</p>
          </div>
          <div className="flex items-center gap-8">
             <div className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Sincronizado
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Total Contratos" value={formatBRL(summary.budget)} icon={<DollarSign size={24}/>} />
                <StatCard title="Total Medido/Pago" value={formatBRL(summary.revenue)} icon={<TrendingUp size={24}/>} colorClass="bg-white border-l-4 border-emerald-500" trend={{ value: 12, isPositive: true }} />
                <StatCard title="Despesas Reais" value={formatBRL(summary.expenses)} icon={<TrendingDown size={24}/>} colorClass="bg-white border-l-4 border-rose-500" />
                <StatCard title="Lucro Líquido Atual" value={formatBRL(summary.currentProfit)} icon={<Coins size={24}/>} colorClass="bg-slate-900 text-white shadow-2xl" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Medição Prevista" value={formatBRL(summary.plannedRevenue)} icon={<BarChart3 size={24}/>} colorClass="bg-blue-50 border-l-4 border-blue-400" />
                <StatCard title="Lucro Previsto" value={formatBRL(summary.plannedProfit)} icon={<Calculator size={24}/>} colorClass="bg-indigo-50 border-l-4 border-indigo-400" />
                <StatCard title="Imposto Estimado" value={formatBRL(summary.taxes)} icon={<Landmark size={24}/>} colorClass="bg-orange-50 border-l-4 border-orange-400" />
                <StatCard title="Comissão Estimada" value={formatBRL(summary.commissions)} icon={<Percent size={24}/>} colorClass="bg-amber-50 border-l-4 border-amber-400" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                  <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3"><PieIcon className="text-blue-500" /> Distribuição Financeira</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col justify-center text-center">
                    <Receipt size={48} className="text-slate-200 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-slate-800 uppercase mb-2">Gestão Tributária</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase max-w-xs mx-auto">Comissão calculada após desconto de impostos sobre cada medição real.</p>
                </div>
              </div>
            </div>
          )}

          {activeView === 'reports' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in slide-in-from-right-8 duration-700 pb-20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Extrato de Despesas</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Detalhamento discriminado por data e obra</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <Filter size={18} className="text-slate-400 ml-2" />
                  <select 
                    value={reportFilterProject} 
                    onChange={e => setReportFilterProject(e.target.value)}
                    className="bg-transparent font-black text-[10px] uppercase outline-none text-slate-700 min-w-[150px]"
                  >
                    <option value="all">Todas as Obras</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Data</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Obra</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Descrição</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Categoria</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Valor</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Ações</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {allExpensesSorted.length > 0 ? allExpensesSorted.map(expense => (
                           <tr key={expense.id} className="hover:bg-slate-50/80 transition-all group">
                              <td className="px-10 py-6">
                                <span className="font-black text-slate-600 text-xs">{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                              </td>
                              <td className="px-10 py-6">
                                <span className="font-bold text-slate-900 text-xs uppercase">{expense.projectName}</span>
                              </td>
                              <td className="px-10 py-6 font-medium text-slate-500 text-xs italic">{expense.description}</td>
                              <td className="px-10 py-6">
                                 <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase border border-slate-200/50">{expense.category}</span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <span className="font-black text-rose-600 text-sm">{formatBRL(expense.amount)}</span>
                              </td>
                              <td className="px-10 py-6 text-center">
                                 <button onClick={() => openTransactionEdit(expense.projectId, 'expense', expense.id)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                    <Edit2 size={14} />
                                 </button>
                              </td>
                           </tr>
                         )) : (
                           <tr><td colSpan={6} className="px-10 py-20 text-center text-slate-400 font-black uppercase text-xs">Nenhuma despesa encontrada.</td></tr>
                         )}
                      </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-10 pb-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Obras Ativas</h3>
                  <button onClick={() => { setEditingProjectId(null); setIsProjectModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-4">
                    <Plus size={22} /> Nova Obra
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {projects.map(p => {
                    const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                    const pRevenue = p.revenues.reduce((s, r) => s + r.amount, 0);
                    return (
                      <div key={p.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg group relative overflow-hidden flex flex-col h-full border-t-8 border-t-blue-600">
                        <div className="absolute top-8 right-8 flex gap-2">
                          <button onClick={() => openProjectEdit(p)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          {auth.currentUser?.role === 'admin' && (
                            <button onClick={() => handleDeleteProject(p.id, p.name)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-2xl uppercase mb-1 text-slate-800 pr-24">{p.name}</h4>
                          <div className="flex gap-4 mb-4">
                             <div className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-full text-slate-500">Imp: {p.taxPercentage}%</div>
                             <div className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1.5 rounded-full text-slate-500">Com: {p.commissionPercentage}%</div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><MapPin size={12} /> {p.location || 'Local indefinido'}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Custos Totais</p>
                               <p className="font-black text-rose-600 text-lg">{formatBRL(pExpenses)}</p>
                            </div>
                            <div className="p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                               <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Faturamento Real</p>
                               <p className="font-black text-emerald-700 text-lg">{formatBRL(pRevenue)}</p>
                            </div>
                          </div>

                          <div className="bg-blue-50/50 rounded-[2rem] p-6 mb-8 border border-blue-100">
                             <h5 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2 mb-4">
                                <Clock size={14} /> Medições Previstas ({p.plannedRevenues?.length || 0})
                             </h5>
                             <div className="space-y-3">
                                {p.plannedRevenues && p.plannedRevenues.length > 0 ? p.plannedRevenues.map(rev => (
                                   <div key={rev.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-blue-100">
                                      <div>
                                         <p className="font-black text-slate-800 text-sm">{formatBRL(rev.amount)}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase">{rev.description} - {new Date(rev.date).toLocaleDateString()}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => openTransactionEdit(p.id, 'planned_revenue', rev.id)} className="p-2 text-slate-300 hover:text-blue-600"><Edit2 size={16} /></button>
                                        <button onClick={() => handleMarkAsPaid(p.id, rev.id)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"><CheckCircle size={16} /></button>
                                      </div>
                                   </div>
                                )) : (
                                   <p className="text-[9px] font-bold text-slate-400 uppercase italic">Sem medições pendentes.</p>
                                )}
                             </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-auto">
                          <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, type: 'expense' })} className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Custo</button>
                          <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, type: 'revenue' })} className="py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Receita</button>
                          <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, transactionId: null, type: 'planned_revenue' })} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Previsto</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          )}

          {activeView === 'team' && (
            <div className="max-w-7xl mx-auto space-y-10">
               <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Equipe</h3>
                  <button onClick={() => setIsAddingUser(true)} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase shadow-lg">Novo Usuário</button>
               </div>
               <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                       <tr><th className="px-8 py-6 text-[10px] font-black uppercase">Nome</th><th className="px-8 py-6 text-[10px] font-black uppercase">Função</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {companyUsers.map(u => (
                         <tr key={u.id}><td className="px-8 py-6 font-bold">{u.fullName}</td><td className="px-8 py-6 uppercase text-[10px] font-black">{u.role}</td></tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeView === 'ai' && (
             <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-black uppercase">Auditor Inteligente</h3>
                   <button onClick={async () => { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }} className="p-4 bg-slate-100 rounded-2xl"><RefreshCw size={24} className={isAiLoading ? 'animate-spin' : ''} /></button>
                </div>
                <div className="bg-slate-50 p-10 rounded-[2rem] prose prose-slate max-w-none">{aiReport || "Toque em atualizar."}</div>
             </div>
          )}
        </div>
      </main>

      {/* MODAL: OBRA (NOVA / EDITAR) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-500 my-auto">
              <div className="p-10 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase">{editingProjectId ? 'Corrigir Obra' : 'Nova Obra'}</h3>
                 <button onClick={() => setIsProjectModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full"><X size={32} /></button>
              </div>
              <form onSubmit={handleSaveProject} className="p-12 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <input required placeholder="Obra / Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    <input required placeholder="Contratante" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                 </div>
                 <input placeholder="Endereço / Local" value={projLocation} onChange={e => setProjLocation(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                 <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Valor Contratado</label><input required type="number" step="0.01" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Imposto (%)</label><input required type="number" step="0.01" value={projTax} onChange={e => setProjTax(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-orange-600" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Comissão (%)</label><input required type="number" step="0.01" value={projCommission} onChange={e => setProjCommission(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-amber-600" /></div>
                 </div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-4">Início da Obra</label><input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /></div>
                 <button type="submit" className="w-full py-7 bg-blue-600 text-white font-black rounded-3xl uppercase shadow-xl flex items-center justify-center gap-4"><Save size={24} /> {editingProjectId ? 'Salvar Correções' : 'Registrar Obra'}</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO (NOVO / EDITAR) */}
      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
               <div className={`p-10 text-white flex justify-between items-center ${transactionModal.type === 'expense' ? 'bg-slate-900' : transactionModal.type === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  <h3 className="text-2xl font-black uppercase">{transactionModal.transactionId ? 'Editar Lançamento' : transactionModal.type === 'expense' ? 'Nova Despesa' : 'Nova Medição'}</h3>
                  <button onClick={() => { setTransactionModal({ isOpen: false, projectId: null, transactionId: null, type: 'expense' }); setFormDesc(''); setFormVal(''); }} className="p-4 hover:bg-white/15 rounded-full"><X size={32} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  setProjects(projects.map(p => {
                    if (p.id !== transactionModal.projectId) return p;
                    
                    const updateItem = (list: any[]) => {
                      if (transactionModal.transactionId) {
                        return list.map(item => item.id === transactionModal.transactionId ? { ...item, description: formDesc, amount: Number(formVal), date: formDateInput, category: formCat } : item);
                      }
                      const newItem = { id: crypto.randomUUID(), description: formDesc, amount: Number(formVal), date: formDateInput, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.fullName, category: formCat };
                      return [...list, newItem];
                    };

                    if (transactionModal.type === 'expense') return { ...p, expenses: updateItem(p.expenses) };
                    if (transactionModal.type === 'revenue') return { ...p, revenues: updateItem(p.revenues) };
                    return { ...p, plannedRevenues: updateItem(p.plannedRevenues) };
                  }));
                  setTransactionModal({ isOpen: false, projectId: null, transactionId: null, type: 'expense' });
                  setFormDesc(''); setFormVal('');
               }} className="p-10 space-y-6">
                  <input required placeholder="Descrição / Identificação" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                  <div className="grid grid-cols-2 gap-6">
                    <input required type="number" step="0.01" placeholder="Valor R$" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl" />
                    <input required type="date" value={formDateInput} onChange={e => setFormDateInput(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                  </div>
                  {transactionModal.type === 'expense' && (
                    <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase outline-none">
                      {['Material', 'Mão de Obra', 'Logística', 'Equipamentos', 'Impostos', 'Comissão', 'Serviços Terceiros', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <button type="submit" className={`w-full py-6 text-white font-black rounded-2xl uppercase shadow-xl ${transactionModal.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>{transactionModal.transactionId ? 'Salvar Alterações' : 'Confirmar Registro'}</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
