
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  HardHat, 
  TrendingUp, 
  Plus, 
  Trash2, 
  BrainCircuit, 
  DollarSign, 
  BarChart3, 
  X, 
  Loader2, 
  Save, 
  Handshake, 
  CheckCircle2, 
  FileUp, 
  FileCheck2, 
  ShieldCheck, 
  LogOut,
  KeyRound,
  Building2,
  ArrowRight,
  TrendingDown,
  Briefcase,
  Coins,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { Project, ExpenseCategory, AuthState, Revenue, Expense } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials, analyzeProjectDocument } from './services/geminiService';

const App: React.FC = () => {
  // --- ESTADO DE AUTENTICAÇÃO ---
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem('erp_obras_auth_v2');
      return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
    } catch {
      return { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
    }
  });

  // --- ESTADO DA APLICAÇÃO ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'ai'>('dashboard');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docStatus, setDocStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // --- FORMULÁRIOS ---
  const [loginCompany, setLoginCompany] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);
  const [extractedData, setExtractedData] = useState<Partial<Project> | null>(null);

  const [formDesc, setFormDesc] = useState('');
  const [formVal, setFormVal] = useState('');
  const [formCat, setFormCat] = useState<ExpenseCategory>('Material');
  const [transactionModal, setTransactionModal] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    type: 'expense' | 'revenue' 
  }>({
    isOpen: false, projectId: null, type: 'expense'
  });

  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    if (auth.isLoggedIn) {
      localStorage.setItem('erp_obras_auth_v2', JSON.stringify(auth));
      const saved = localStorage.getItem(`erp_data_${auth.companyKey}`);
      if (saved) {
        try {
          setProjects(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar dados:", e);
        }
      }
    }
  }, [auth]);

  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem(`erp_data_${auth.companyKey}`, JSON.stringify(projects));
    }
  }, [projects, auth.isLoggedIn, auth.companyKey]);

  // --- LÓGICA DE NEGÓCIO ---
  const handleLogout = () => {
    if (window.confirm("Deseja realmente encerrar a sessão?")) {
      localStorage.removeItem('erp_obras_auth_v2');
      setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
      setProjects([]);
      setAiReport('');
      setActiveView('dashboard');
    }
  };

  const triggerAiAuditoria = async () => {
    setIsAiLoading(true);
    const report = await analyzeFinancials(projects);
    setAiReport(report);
    setIsAiLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDoc(true);
    setDocStatus('idle');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const result = await analyzeProjectDocument(base64, file.type);
        if (result) {
          setProjName(result.name || '');
          setProjClient(result.client || '');
          setProjBudget(result.budget?.toString() || '');
          if (result.startDate) setProjDate(result.startDate);
          setExtractedData(result);
          setDocStatus('success');
        } else {
          setDocStatus('error');
        }
      } catch (err) {
        setDocStatus('error');
      } finally {
        setIsProcessingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: projName,
      client: projClient,
      budget: Number(projBudget),
      startDate: projDate,
      status: 'Em Execução',
      expenses: (extractedData?.expenses || []).map((exp: any) => ({
        ...exp,
        id: crypto.randomUUID(),
        createdAt: now,
        category: exp.category || 'Outros'
      })),
      revenues: (extractedData?.revenues || []).map((rev: any) => ({
        ...rev,
        id: crypto.randomUUID(),
        createdAt: now
      })),
      plannedRevenues: []
    };
    setProjects(prev => [...prev, newProj]);
    setIsAddingProject(false);
    resetProjectForm();
  };

  const resetProjectForm = () => {
    setProjName(''); setProjClient(''); setProjBudget('');
    setProjDate(new Date().toISOString().split('T')[0]);
    setExtractedData(null); setDocStatus('idle');
  };

  const summary = useMemo(() => {
    const budget = projects.reduce((s, p) => s + p.budget, 0);
    const revenue = projects.reduce((s, p) => s + p.revenues.reduce((rs, r) => rs + r.amount, 0), 0);
    const expenses = projects.reduce((s, p) => s + p.expenses.reduce((es, e) => es + e.amount, 0), 0);
    const estimatedProfit = budget - expenses;
    return { budget, revenue, expenses, estimatedProfit };
  }, [projects]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // --- INTERFACE ---
  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3rem] shadow-2xl z-10">
          <div className="text-center mb-12">
            <div className="inline-flex p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl mb-6">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">ERPBrasil<br/><span className="text-blue-500 text-2xl tracking-widest">Obras</span></h1>
          </div>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const key = loginCompany.toLowerCase().trim().replace(/\s+/g, '_');
            setAuth({ isLoggedIn: true, companyName: loginCompany, companyKey: key, userRole: 'admin' });
          }} className="space-y-6">
            <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Sua Empresa" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 font-medium" />
            <input required type="password" value={loginKey} onChange={e => setLoginKey(e.target.value)} placeholder="Chave de Acesso" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500" />
            <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] uppercase shadow-2xl transition-all">Entrar no Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      <aside className="w-full md:w-80 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-2xl">
        <div className="p-10 border-b border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl shadow-xl"><Building2 size={28} /></div>
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none">ERP<br/><span className="text-blue-500">OBRAS</span></h1>
        </div>
        <nav className="p-8 space-y-3 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={22} /> Painel Principal
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Briefcase size={22} /> Minhas Obras
          </button>
          <button onClick={() => { setActiveView('ai'); triggerAiAuditoria(); }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BrainCircuit size={22} /> Auditor IA
          </button>
        </nav>
        <div className="p-8 border-t border-slate-800 bg-slate-900/50">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase transition-all">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-200 px-12 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Organização</h2>
            <p className="font-black text-slate-900 uppercase text-lg">{auth.companyName}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div> Monitoramento IA Ativo
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Contratos" value={formatBRL(summary.budget)} icon={<DollarSign size={24}/>} />
                <StatCard title="Recebido" value={formatBRL(summary.revenue)} icon={<TrendingUp size={24}/>} colorClass="bg-white border-l-4 border-emerald-500" />
                <StatCard title="Custos" value={formatBRL(summary.expenses)} icon={<TrendingDown size={24}/>} colorClass="bg-white border-l-4 border-rose-500" />
                <StatCard title="Lucro Estimado" value={formatBRL(summary.estimatedProfit)} icon={<Coins size={24}/>} colorClass="bg-slate-900 text-white border-none shadow-2xl" />
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                 <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-4"><Receipt className="text-blue-500" /> Portfólio de Execução</h3>
                 </div>
                 {projects.length === 0 ? (
                    <div className="py-24 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Inicie cadastrando sua primeira obra no menu lateral.</p>
                    </div>
                 ) : (
                    <div className="space-y-6">
                      {projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-7 bg-slate-50/50 rounded-[2rem] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-blue-100">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-md font-black text-blue-600 text-2xl border border-slate-100">{p.name[0]}</div>
                            <div>
                              <h4 className="font-black text-base uppercase text-slate-800">{p.name}</h4>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{p.client}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 text-lg">{formatBRL(p.budget)}</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Status: OK</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 )}
              </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="max-w-5xl mx-auto p-16 bg-white rounded-[4rem] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-700">
               <div className="flex items-center justify-between mb-16">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-600/40"><BrainCircuit size={40} /></div>
                    <div>
                      <h3 className="text-3xl font-black uppercase text-slate-800 leading-none">Relatório Consolidado</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3">Análise Financeira IA</p>
                    </div>
                  </div>
                  <button onClick={triggerAiAuditoria} disabled={isAiLoading} className="p-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all hover:rotate-180 disabled:opacity-50">
                    {isAiLoading ? <Loader2 className="animate-spin" size={28} /> : <RefreshCw size={28} />}
                  </button>
               </div>
               
               <div className="bg-slate-50/50 p-12 rounded-[3rem] border border-slate-100 min-h-[500px]">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-8">
                       <Loader2 className="animate-spin text-blue-600" size={72} />
                       <p className="text-base font-black uppercase text-slate-800 animate-pulse tracking-widest">Processando auditoria de custos...</p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-medium text-slate-800 text-lg leading-relaxed">
                      {aiReport || "Inicie a auditoria clicando no botão de atualizar."}
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeView === 'projects' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black uppercase text-slate-800">Canteiro de Gestão</h3>
                <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl transition-all flex items-center gap-4">
                  <Plus size={22} /> Nova Obra
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
                {projects.map(p => {
                  const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                  const pRevenue = p.revenues.reduce((s, r) => s + r.amount, 0);
                  const profit = p.budget - pExpenses;
                  return (
                    <div key={p.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg group relative overflow-hidden">
                      <button onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))} className="absolute top-10 right-10 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={22} /></button>
                      <h4 className="font-black text-2xl uppercase mb-2 truncate pr-12 text-slate-800 leading-none">{p.name}</h4>
                      <p className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest w-fit mb-8">{p.client}</p>
                      
                      <div className="grid grid-cols-2 gap-5 mb-10">
                        <div className="p-5 bg-rose-50/50 rounded-3xl border border-rose-100">
                          <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Gastos</p>
                          <p className="font-black text-rose-600 text-base">{formatBRL(pExpenses)}</p>
                        </div>
                        <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Medições</p>
                          <p className="font-black text-emerald-600 text-base">{formatBRL(pRevenue)}</p>
                        </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl">Lançar Custo</button>
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'revenue' })} className="py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl">Medição</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: NOVA OBRA */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">
              <div className="p-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Cadastro de Obra</h3>
                 <button onClick={() => { setIsAddingProject(false); resetProjectForm(); }} className="p-4 hover:bg-white/15 rounded-full transition-all"><X size={32} /></button>
              </div>
              <div className="p-12 space-y-12 overflow-y-auto">
                 <div className="bg-slate-50 p-12 rounded-[3rem] border-4 border-dashed border-slate-200 relative text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all group">
                    {isProcessingDoc ? (
                      <div className="py-10 flex flex-col items-center gap-6">
                         <Loader2 className="animate-spin text-blue-600" size={64} />
                         <p className="text-sm font-black uppercase text-blue-600 animate-pulse tracking-widest">Extraindo dados do contrato...</p>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center gap-6">
                           {docStatus === 'success' ? (
                             <div className="p-6 bg-emerald-100 rounded-[2rem] text-emerald-600 shadow-2xl"><FileCheck2 size={56} /></div>
                           ) : (
                             <div className="p-6 bg-white text-slate-300 rounded-[2rem] shadow-2xl group-hover:text-blue-600 transition-colors"><FileUp size={56} /></div>
                           )}
                           <p className="text-lg font-black uppercase text-slate-800">Arraste seu PDF ou Imagem aqui</p>
                        </div>
                      </>
                    )}
                 </div>
                 <form onSubmit={handleCreateProject} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <input required placeholder="Nome do Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500" />
                       <input required placeholder="Cliente" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <input required type="number" step="0.01" placeholder="Valor Global R$" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-xl outline-none focus:border-blue-500" />
                       <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500" />
                    </div>
                    <button type="submit" className="w-full py-7 bg-blue-600 text-white font-black rounded-[2.5rem] uppercase shadow-2xl flex items-center justify-center gap-4">
                       <Save size={28} /> Salvar Projeto
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO FINANCEIRO */}
      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
               <div className={`p-10 text-white flex justify-between items-center shadow-lg ${transactionModal.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Novo Lançamento</h3>
                  <button onClick={() => setTransactionModal({ isOpen: false, projectId: null, type: 'expense' })} className="p-4 hover:bg-white/15 rounded-full transition-all"><X size={32} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const now = new Date().toISOString();
                  setProjects(prev => prev.map(p => {
                    if (p.id !== transactionModal.projectId) return p;
                    const item = { id: crypto.randomUUID(), description: formDesc, amount: Number(formVal), date: new Date().toISOString().split('T')[0], createdAt: now };
                    if (transactionModal.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCat }] };
                    return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setTransactionModal({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDesc(''); setFormVal('');
               }} className="p-12 space-y-8">
                  <input required placeholder="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold outline-none" />
                  <input required type="number" step="0.01" placeholder="Valor R$" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-black text-2xl outline-none" />
                  {transactionModal.type === 'expense' && (
                    <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-black uppercase text-[11px] tracking-widest outline-none">
                      <option value="Material">Material</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Comissão">Comissão</option>
                      <option value="Logística">Logística</option>
                      <option value="Equipamentos">Equipamentos</option>
                      <option value="Serviços Terceiros">Serviços Terceiros</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                  <button type="submit" className={`w-full py-6 text-white font-black rounded-[2.5rem] uppercase shadow-2xl transition-all ${transactionModal.type === 'expense' ? 'bg-slate-900 shadow-slate-900/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>
                    Confirmar
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
