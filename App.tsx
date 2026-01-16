
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
  Receipt
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

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO ---
  useEffect(() => {
    if (auth.isLoggedIn) {
      localStorage.setItem('erp_obras_auth_v2', JSON.stringify(auth));
      const saved = localStorage.getItem(`erp_data_${auth.companyKey}`);
      if (saved) {
        try {
          setProjects(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar dados salvos:", e);
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
    if (window.confirm("Deseja realmente encerrar a sessão? Os dados de sua empresa permanecem salvos localmente para acesso futuro com sua chave.")) {
      localStorage.removeItem('erp_obras_auth_v2');
      setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
      setProjects([]);
      setAiReport('');
      setActiveView('dashboard');
    }
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
        console.error("Erro no processamento IA do arquivo:", err);
        setDocStatus('error');
      } finally {
        setIsProcessingDoc(false);
      }
    };
    reader.onerror = () => {
      setDocStatus('error');
      setIsProcessingDoc(false);
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

  // --- TELAS ---
  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 blur-[150px] rounded-full"></div>
        
        <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3rem] shadow-2xl z-10 animate-in fade-in zoom-in duration-700">
          <div className="text-center mb-12">
            <div className="inline-flex p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl mb-6">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">ERPBrasil<br/><span className="text-blue-500 text-2xl tracking-widest">Obras</span></h1>
            <p className="text-slate-400 font-semibold text-sm uppercase tracking-widest opacity-60">Tecnologia para Empreiteiras</p>
          </div>
          
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const key = loginCompany.toLowerCase().trim().replace(/\s+/g, '_');
            setAuth({ isLoggedIn: true, companyName: loginCompany, companyKey: key, userRole: 'admin' });
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em]">Sua Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Ex: Engenharia Civil S.A." className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:bg-white/10 transition-all placeholder:text-slate-600 font-medium" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em]">Chave de Acesso</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input required type="password" value={loginKey} onChange={e => setLoginKey(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 focus:bg-white/10 transition-all placeholder:text-slate-600" />
              </div>
            </div>
            <button type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] uppercase shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-3 group">
              Acessar Painel <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* SIDEBAR REFINADA */}
      <aside className="w-full md:w-80 bg-slate-900 text-white flex flex-col shrink-0 z-30 shadow-2xl">
        <div className="p-10 border-b border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl shadow-xl"><Building2 size={28} /></div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">ERP<br/><span className="text-blue-500">OBRAS</span></h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Professional</p>
          </div>
        </div>
        <nav className="p-8 space-y-3 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'dashboard' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={22} /> Painel Principal
          </button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Briefcase size={22} /> Minhas Obras
          </button>
          <button onClick={async () => { 
            setActiveView('ai'); 
            if(!aiReport) { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }
          }} className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] font-bold text-sm transition-all ${activeView === 'ai' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BrainCircuit size={22} /> Auditor IA
          </button>
        </nav>
        <div className="p-8 border-t border-slate-800 bg-slate-900/50">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase transition-all">
            <LogOut size={20} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-24 bg-white border-b border-slate-200 px-12 flex items-center justify-between shrink-0 z-10">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Empresa Logada</h2>
            <p className="font-black text-slate-900 uppercase text-lg tracking-tight">{auth.companyName}</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratos Ativos</span>
              <span className="font-black text-blue-600 text-lg">{formatBRL(summary.budget)}</span>
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-3 shadow-sm">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Monitoramento Ativo
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Total Contratos" value={formatBRL(summary.budget)} icon={<DollarSign size={24}/>} colorClass="bg-white border-slate-200" />
                <StatCard title="Total Medido" value={formatBRL(summary.revenue)} icon={<TrendingUp size={24}/>} colorClass="bg-white border-l-4 border-emerald-500" />
                <StatCard title="Custos Pagos" value={formatBRL(summary.expenses)} icon={<TrendingDown size={24}/>} colorClass="bg-white border-l-4 border-rose-500" />
                {/* ÍCONE DE LUCRO ESTIMADO SOLICITADO */}
                <StatCard title="Lucro Estimado" value={formatBRL(summary.estimatedProfit)} icon={<Coins size={24}/>} colorClass="bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/30" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-4 text-slate-800"><Receipt className="text-blue-500" /> Top Projetos Financeiros</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenado por Valor</span>
                  </div>
                  {projects.length === 0 ? (
                    <div className="py-24 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <HardHat size={56} className="mx-auto text-slate-200 mb-6" />
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma obra cadastrada para exibição.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {projects.sort((a,b) => b.budget - a.budget).slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between p-7 bg-slate-50/50 rounded-[2rem] hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all border border-transparent">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-md font-black text-blue-600 text-2xl border border-slate-100">{p.name[0]}</div>
                            <div>
                              <h4 className="font-black text-base uppercase text-slate-800 tracking-tight">{p.name}</h4>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.client}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 text-lg">{formatBRL(p.budget)}</p>
                            <div className="flex items-center gap-2 justify-end mt-1">
                               <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saudável</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-600/30 flex flex-col justify-between overflow-hidden relative group">
                   <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                   <div className="space-y-6 relative z-10">
                      <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl w-fit"><BrainCircuit size={48} className="text-blue-100" /></div>
                      <h3 className="text-3xl font-black uppercase leading-[1.1] tracking-tight">Relatório de Lucratividade</h3>
                      <p className="text-blue-50 text-base font-medium leading-relaxed opacity-90">Análise inteligente baseada em IA que cruza dados de medições reais vs orçamentos previstos.</p>
                   </div>
                   <button onClick={() => setActiveView('ai')} className="mt-12 w-full py-5 bg-white text-blue-600 font-black rounded-2xl uppercase text-xs shadow-xl hover:bg-blue-50 transition-all transform active:scale-95 relative z-10">Visualizar Auditoria</button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'projects' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none">Canteiro de Gestão</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Controle Individual por Obra</p>
                </div>
                <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-2xl shadow-blue-600/30 transition-all flex items-center gap-4 transform hover:-translate-y-1">
                  <Plus size={22} /> Nova Obra
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
                {projects.map(p => {
                  const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                  const pRevenue = p.revenues.reduce((s, r) => s + r.amount, 0);
                  const progress = p.budget > 0 ? Math.min((pRevenue / p.budget) * 100, 100) : 0;
                  
                  return (
                    <div key={p.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-lg hover:border-blue-400 hover:shadow-2xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -z-10 group-hover:bg-blue-50 transition-colors"></div>
                      <button onClick={() => { if(confirm('Excluir obra permanentemente?')) setProjects(prev => prev.filter(x => x.id !== p.id)) }} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-125">
                        <Trash2 size={22} />
                      </button>
                      
                      <div className="mb-8">
                        <h4 className="font-black text-2xl uppercase mb-2 truncate pr-12 text-slate-800 tracking-tight leading-none">{p.name}</h4>
                        <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{p.client}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-5 mb-10">
                        <div className="p-5 bg-rose-50/50 rounded-3xl border border-rose-100">
                          <p className="text-[9px] font-black text-rose-400 uppercase mb-1 tracking-widest">Custos Pagos</p>
                          <p className="font-black text-rose-600 text-base">{formatBRL(pExpenses)}</p>
                        </div>
                        <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-widest">Medições</p>
                          <p className="font-black text-emerald-600 text-base">{formatBRL(pRevenue)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Eficiência de Receita</span>
                            <span className="text-blue-600">{Math.round(progress)}%</span>
                         </div>
                         <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${progress}%`}}></div>
                         </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95">Lançar Custo</button>
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'revenue' })} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95">Receber</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="max-w-5xl mx-auto p-16 bg-white rounded-[4rem] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 blur-3xl rounded-full -mr-32 -mt-32"></div>
               <div className="flex items-center justify-between mb-16 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-600/40">
                      <BrainCircuit size={40} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tight leading-none">Auditoria de Negócio</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">IA Consultiva Especializada</p>
                    </div>
                  </div>
                  <button onClick={async () => { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }} className="p-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all hover:rotate-180 duration-500">
                    <TrendingUp size={28} />
                  </button>
               </div>
               
               <div className="prose prose-slate max-w-none prose-p:font-medium prose-p:text-slate-700 prose-headings:font-black prose-headings:uppercase leading-relaxed bg-slate-50/50 p-12 rounded-[3rem] border border-slate-100 min-h-[500px] shadow-inner relative z-10">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-8">
                       <div className="relative">
                          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                          <Loader2 className="animate-spin text-blue-600 relative z-10" size={72} />
                       </div>
                       <div className="text-center">
                         <p className="text-base font-black uppercase text-slate-800 animate-pulse tracking-widest">Auditando Contratos e Fluxos...</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 tracking-[0.3em]">IA em processamento neural</p>
                       </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-medium text-slate-800 text-lg leading-relaxed">
                      {aiReport || "Clique no botão de atualizar acima para iniciar a consultoria automática da IA sobre seus dados financeiros atuais."}
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: NOVA OBRA - COM UPLOAD PDF CORRIGIDO */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">
              <div className="p-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center shrink-0 shadow-lg">
                 <div className="flex items-center gap-5">
                   <div className="p-3 bg-white/10 rounded-2xl"><Plus size={32} /></div>
                   <div>
                     <h3 className="text-2xl font-black uppercase tracking-tight">Registro de Novo Projeto</h3>
                     <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-1">Gestão Profissional de Contratos</p>
                   </div>
                 </div>
                 <button onClick={() => { setIsAddingProject(false); resetProjectForm(); }} className="p-4 hover:bg-white/15 rounded-full transition-all hover:rotate-90 duration-300"><X size={32} /></button>
              </div>
              
              <div className="p-12 space-y-12 overflow-y-auto custom-scrollbar">
                 <div className="bg-slate-50 p-12 rounded-[3rem] border-4 border-dashed border-slate-200 relative text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all group cursor-pointer">
                    {isProcessingDoc ? (
                      <div className="py-10 flex flex-col items-center gap-6">
                         <div className="relative">
                            <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="animate-spin text-blue-600 relative z-10" size={64} />
                         </div>
                         <div className="text-center">
                            <p className="text-sm font-black uppercase text-blue-600 animate-pulse tracking-widest">Gemini 3 Pro lendo documento...</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-[0.25em]">Mapeando Tabelas e Custos</p>
                         </div>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Arraste aqui seu PDF" />
                        <div className="flex flex-col items-center gap-6">
                           {docStatus === 'success' ? (
                             <div className="p-6 bg-emerald-100 rounded-[2rem] text-emerald-600 shadow-2xl shadow-emerald-600/20 animate-bounce"><FileCheck2 size={56} /></div>
                           ) : (
                             <div className={`p-6 rounded-[2rem] shadow-2xl transition-all duration-500 ${docStatus === 'error' ? 'bg-rose-100 text-rose-500 shadow-rose-500/20' : 'bg-white text-slate-300 group-hover:text-blue-600 group-hover:shadow-blue-600/10'}`}>
                               <FileUp size={56} />
                             </div>
                           )}
                           <div className="space-y-2">
                             <p className="text-lg font-black uppercase text-slate-800 tracking-tight">Importar Medição / Contrato</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Arraste PDF ou Imagem aqui</p>
                           </div>
                           {docStatus === 'success' && <div className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Extração Completa</div>}
                        </div>
                      </>
                    )}
                 </div>

                 <form onSubmit={handleCreateProject} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Identificação da Obra</label>
                         <input required placeholder="Ex: Hospital Central Bloco B" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Órgão Público / Cliente</label>
                         <input required placeholder="Ex: Prefeitura Municipal" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800" />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Valor Global Contrato R$</label>
                         <input required type="number" step="0.01" placeholder="0,00" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-blue-600" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Data Início / Assinatura</label>
                         <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800" />
                       </div>
                    </div>
                    <button type="submit" className="w-full py-7 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2.5rem] uppercase shadow-2xl shadow-blue-600/40 transition-all flex items-center justify-center gap-4 text-sm tracking-widest transform active:scale-95">
                       <Save size={28} /> Confirmar Cadastro de Obra
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO FINANCEIRO REFINADO */}
      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
               <div className={`p-10 text-white flex justify-between items-center shadow-lg ${transactionModal.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-white/15 rounded-2xl">
                      {transactionModal.type === 'expense' ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">Novo Lançamento</h3>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Fluxo de Caixa Operacional</p>
                    </div>
                  </div>
                  <button onClick={() => setTransactionModal({ isOpen: false, projectId: null, type: 'expense' })} className="p-4 hover:bg-white/15 rounded-full transition-all"><X size={32} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const now = new Date().toISOString();
                  setProjects(prev => prev.map(p => {
                    if (p.id !== transactionModal.projectId) return p;
                    const item = { 
                      id: crypto.randomUUID(), 
                      description: formDesc, 
                      amount: Number(formVal), 
                      date: new Date().toISOString().split('T')[0], 
                      createdAt: now 
                    };
                    if (transactionModal.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCat }] };
                    return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setTransactionModal({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDesc(''); setFormVal('');
               }} className="p-12 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Descrição da Operação</label>
                    <input required placeholder="Ex: NF 1022 - Cimento Votoran" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Valor Líquido R$</label>
                    <input required type="number" step="0.01" placeholder="0,00" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-black text-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900" />
                  </div>
                  {transactionModal.type === 'expense' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Classificação Contábil</label>
                      <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-black uppercase text-[11px] tracking-widest outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer">
                        <option value="Material">Material de Construção</option>
                        <option value="Mão de Obra">Folha de Mão de Obra</option>
                        <option value="Impostos">Encargos e Impostos</option>
                        <option value="Comissão">Comissão de Venda/Obra</option>
                        <option value="Logística">Fretes e Logística</option>
                        <option value="Equipamentos">Aluguel de Máquinas</option>
                        <option value="Serviços Terceiros">Subempreiteiros</option>
                        <option value="Outros">Outras Despesas</option>
                      </select>
                    </div>
                  )}
                  <button type="submit" className={`w-full py-6 text-white font-black rounded-[2.5rem] uppercase shadow-2xl transition-all transform active:scale-95 text-xs tracking-[0.2em] ${transactionModal.type === 'expense' ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'}`}>
                    Confirmar Lançamento
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
