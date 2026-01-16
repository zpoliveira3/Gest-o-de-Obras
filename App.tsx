
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, TrendingUp, Plus, Trash2, BrainCircuit, DollarSign, 
  BarChart3, X, Loader2, Save, FileUp, ShieldCheck, 
  LogOut, KeyRound, Building2, TrendingDown, Briefcase, 
  Coins, Receipt, RefreshCw, MapPin, PieChart as PieIcon, Users, UserPlus, Shield,
  Calculator, Percent, Landmark, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Project, ExpenseCategory, AuthState, User, UserRole } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials, analyzeProjectDocument } from './services/geminiService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('erp_obras_auth_v3');
    return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '' };
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'ai' | 'analytics' | 'team'>('dashboard');
  
  // Login States
  const [loginCompany, setLoginCompany] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Project States
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projLocation, setProjLocation] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);

  // Team Management
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('engenheiro');

  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [transactionModal, setTransactionModal] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    type: 'expense' | 'revenue' | 'planned_revenue' 
  }>({
    isOpen: false, projectId: null, type: 'expense'
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

  const summary = useMemo(() => {
    const budget = projects.reduce((s, p) => s + p.budget, 0);
    const revenue = projects.reduce((s, p) => s + p.revenues.reduce((rs, r) => rs + r.amount, 0), 0);
    const plannedRevenue = projects.reduce((s, p) => s + (p.plannedRevenues?.reduce((rs, r) => rs + r.amount, 0) || 0), 0);
    const expenses = projects.reduce((s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0);
    
    // Filtros por Categoria
    const taxes = projects.reduce((s, p) => s + p.expenses.filter(e => e.category === 'Impostos').reduce((es, e) => es + e.amount, 0), 0);
    const commissions = projects.reduce((s, p) => s + p.expenses.filter(e => e.category === 'Comissão').reduce((es, e) => es + e.amount, 0), 0);
    
    // Lucros
    const plannedProfit = budget - expenses; // Lucro com base no contrato total
    const currentProfit = revenue - expenses; // Lucro com base no que já entrou

    return { budget, revenue, plannedRevenue, expenses, taxes, commissions, plannedProfit, currentProfit };
  }, [projects]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    projects.forEach(p => p.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    }));
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [projects]);

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
      {/* SIDEBAR */}
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
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Briefcase size={20} /> Projetos
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

      {/* CONTEÚDO */}
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
                <StatCard title="Total Medido/Pago" value={formatBRL(summary.revenue)} icon={<TrendingUp size={24}/>} colorClass="bg-white border-l-4 border-emerald-500" />
                <StatCard title="Despesas Reais" value={formatBRL(summary.expenses)} icon={<TrendingDown size={24}/>} colorClass="bg-white border-l-4 border-rose-500" />
                <StatCard title="Lucro Bruto Atual" value={formatBRL(summary.currentProfit)} icon={<Coins size={24}/>} colorClass="bg-slate-900 text-white shadow-2xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Medição Prevista" value={formatBRL(summary.plannedRevenue)} icon={<BarChart3 size={24}/>} colorClass="bg-blue-50 border-l-4 border-blue-400" />
                <StatCard title="Lucro Previsto" value={formatBRL(summary.plannedProfit)} icon={<Calculator size={24}/>} colorClass="bg-indigo-50 border-l-4 border-indigo-400" />
                <StatCard title="Imposto Pago" value={formatBRL(summary.taxes)} icon={<Landmark size={24}/>} colorClass="bg-orange-50 border-l-4 border-orange-400" />
                <StatCard title="Comissão Paga" value={formatBRL(summary.commissions)} icon={<Percent size={24}/>} colorClass="bg-amber-50 border-l-4 border-amber-400" />
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
                    <h3 className="text-2xl font-black text-slate-800 uppercase mb-2">Visão Executiva</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase max-w-xs mx-auto">Análise de custos e medições filtradas por impostos e comissões.</p>
                </div>
              </div>
            </div>
          )}

          {activeView === 'team' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Colaboradores</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Gerencie acessos da {auth.companyName}</p>
                 </div>
                 <button onClick={() => setIsAddingUser(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-4">
                    <UserPlus size={22} /> Novo Usuário
                 </button>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                       <tr>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Nome</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Login</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400">Função</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {companyUsers.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-10 py-7 font-black text-slate-800">{user.fullName}</td>
                            <td className="px-10 py-7 font-bold text-slate-500">{user.username}</td>
                            <td className="px-10 py-7">
                               <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {user.role}
                               </span>
                            </td>
                            <td className="px-10 py-7 text-right">
                               <button disabled={user.role === 'admin'} className="text-slate-300 hover:text-rose-500 disabled:opacity-30">
                                  <Trash2 size={20} />
                               </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

          {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Obras Ativas</h3>
                  <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-4">
                    <Plus size={22} /> Nova Obra
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
                  {projects.map(p => {
                    const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                    const pRevenue = p.revenues.reduce((s, r) => s + r.amount, 0);
                    const pPlanned = p.plannedRevenues?.reduce((s, r) => s + r.amount, 0) || 0;
                    return (
                      <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-lg group relative overflow-hidden flex flex-col h-full">
                        {/* BOTÃO DE DELETAR OBRA */}
                        {auth.currentUser?.role === 'admin' && (
                          <button 
                            onClick={() => handleDeleteProject(p.id, p.name)}
                            className="absolute top-8 right-8 p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                            title="Excluir Obra"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}

                        <div className="flex-1">
                          <h4 className="font-black text-xl uppercase mb-1 text-slate-800 pr-10">{p.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPin size={12} /> {p.location || 'Local indefinido'}</p>
                          
                          <div className="grid grid-cols-1 gap-3 mb-8">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase">Gasto Atual</p>
                               <p className="font-black text-rose-600 text-sm">{formatBRL(pExpenses)}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                               <p className="text-[9px] font-black text-emerald-600 uppercase">Recebido</p>
                               <p className="font-black text-emerald-700 text-sm">{formatBRL(pRevenue)}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                               <p className="text-[9px] font-black text-blue-600 uppercase">Medição Prevista</p>
                               <p className="font-black text-blue-700 text-sm">{formatBRL(pPlanned)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          <button onClick={() => {
                            setTransactionModal({ isOpen: true, projectId: p.id, type: 'expense' });
                            setFormDateInput(new Date().toISOString().split('T')[0]);
                          }} className="py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Custo</button>
                          <div className="grid grid-cols-1 gap-1">
                            <button onClick={() => {
                              setTransactionModal({ isOpen: true, projectId: p.id, type: 'revenue' });
                              setFormDateInput(new Date().toISOString().split('T')[0]);
                            }} className="py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">Recebido</button>
                            <button onClick={() => {
                              setTransactionModal({ isOpen: true, projectId: p.id, type: 'planned_revenue' });
                              setFormDateInput(new Date().toISOString().split('T')[0]);
                            }} className="py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase">Previsto</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          )}

          {activeView === 'ai' && (
             <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-6">
                     <div className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl"><BrainCircuit size={40} /></div>
                     <div>
                       <h3 className="text-2xl font-black uppercase text-slate-800">Auditor Inteligente</h3>
                       <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">IA analisando custos e margens</p>
                     </div>
                   </div>
                   <button onClick={async () => { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                     <RefreshCw size={24} className={isAiLoading ? 'animate-spin' : ''} />
                   </button>
                </div>
                <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100 min-h-[400px]">
                   {isAiLoading ? (
                     <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <Loader2 className="animate-spin text-blue-600" size={56} />
                        <p className="text-sm font-black uppercase text-slate-800 animate-pulse">Cruzando dados financeiros...</p>
                     </div>
                   ) : (
                     <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-lg">
                       {aiReport || "Toque no botão de atualizar para uma análise estratégica."}
                     </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </main>

      {/* MODAL: NOVO USUÁRIO */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Novo Colaborador</h3>
                 <button onClick={() => setIsAddingUser(false)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleAddUser} className="p-12 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nome Completo</label>
                    <input required value={newUserFullName} onChange={e => setNewUserFullName(e.target.value)} placeholder="Ex: Eng. Roberto" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Login</label>
                       <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="roberto.obra" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Senha</label>
                       <input required type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="••••" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Função</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-[11px]">
                       <option value="engenheiro">Engenharia</option>
                       <option value="financeiro">Financeiro</option>
                       <option value="visitante">Consulta</option>
                    </select>
                 </div>
                 <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl uppercase shadow-xl mt-4">Criar Usuário</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: NOVA OBRA */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-500 my-auto">
              <div className="p-10 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Cadastro de Obra</h3>
                 <button onClick={() => setIsAddingProject(false)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
              </div>
              <div className="p-12 space-y-8">
                 <form onSubmit={(e) => {
                    e.preventDefault();
                    const newP: Project = {
                      id: crypto.randomUUID(), name: projName, client: projClient, budget: Number(projBudget),
                      startDate: projDate, location: projLocation, status: 'Em Execução', expenses: [], revenues: [], plannedRevenues: []
                    };
                    setProjects([...projects, newP]);
                    setIsAddingProject(false);
                 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <input required placeholder="Obra / Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                       <input required placeholder="Contratante" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <input placeholder="Endereço / Local" value={projLocation} onChange={e => setProjLocation(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    <div className="grid grid-cols-2 gap-6">
                       <input required type="number" step="0.01" placeholder="Valor Global" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl" />
                       <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                    </div>
                    <button type="submit" className="w-full py-7 bg-blue-600 text-white font-black rounded-3xl uppercase shadow-2xl flex items-center justify-center gap-4">
                       <Save size={24} /> Registrar Obra
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO FINANCEIRO */}
      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
               <div className={`p-10 text-white flex justify-between items-center ${
                 transactionModal.type === 'expense' ? 'bg-slate-900' : 
                 transactionModal.type === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'
               }`}>
                  <h3 className="text-2xl font-black uppercase">
                    {transactionModal.type === 'expense' ? 'Nova Despesa' : 
                     transactionModal.type === 'revenue' ? 'Medição Realizada' : 'Medição Prevista'}
                  </h3>
                  <button onClick={() => setTransactionModal({ isOpen: false, projectId: null, type: 'expense' })} className="p-4 hover:bg-white/15 rounded-full"><X size={32} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  setProjects(projects.map(p => {
                    if (p.id !== transactionModal.projectId) return p;
                    const item = { 
                      id: crypto.randomUUID(), 
                      description: formDesc, 
                      amount: Number(formVal), 
                      date: formDateInput, 
                      createdAt: new Date().toISOString(),
                      createdBy: auth.currentUser?.fullName
                    };
                    if (transactionModal.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCat }] };
                    if (transactionModal.type === 'revenue') return { ...p, revenues: [...p.revenues, item] };
                    const updatedPlanned = p.plannedRevenues || [];
                    return { ...p, plannedRevenues: [...updatedPlanned, item] };
                  }));
                  setTransactionModal({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDesc(''); setFormVal('');
               }} className="p-10 space-y-6">
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Data do Lançamento</label>
                    <div className="relative">
                       <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                       <input required type="date" value={formDateInput} onChange={e => setFormDateInput(e.target.value)} className="w-full p-5 pl-14 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Descrição</label>
                    <input required placeholder="Ex: Compra de Cimento, NF 044..." value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Valor R$</label>
                    <input required type="number" step="0.01" placeholder="0,00" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl outline-none focus:border-blue-500" />
                  </div>

                  {transactionModal.type === 'expense' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Categoria de Custo</label>
                      <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase outline-none focus:border-blue-500">
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Logística">Logística</option>
                        <option value="Equipamentos">Equipamentos</option>
                        <option value="Impostos">Impostos</option>
                        <option value="Comissão">Comissão</option>
                        <option value="Serviços Terceiros">Serviços Terceiros</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  )}
                  <button type="submit" className={`w-full py-6 text-white font-black rounded-2xl uppercase shadow-xl transition-all ${
                    transactionModal.type === 'expense' ? 'bg-slate-900' : 
                    transactionModal.type === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    Confirmar Registro
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
