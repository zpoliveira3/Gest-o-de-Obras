
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
  TrendingDown
} from 'lucide-react';
import { Project, ExpenseCategory, AuthState } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials, analyzeProjectDocument } from './services/geminiService';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('erp_obras_auth');
    return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
  });

  // --- APP STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'ai'>('dashboard');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docStatus, setDocStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // --- FORM STATES ---
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
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; projectId: string | null; type: 'expense' | 'revenue' }>({
    isOpen: false, projectId: null, type: 'expense'
  });

  const [aiReport, setAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (auth.isLoggedIn) {
      localStorage.setItem('erp_obras_auth', JSON.stringify(auth));
      const saved = localStorage.getItem(`data_${auth.companyKey}`);
      if (saved) setProjects(JSON.parse(saved));
    }
  }, [auth]);

  useEffect(() => {
    if (auth.isLoggedIn) {
      localStorage.setItem(`data_${auth.companyKey}`, JSON.stringify(projects));
    }
  }, [projects, auth.companyKey]);

  // --- ACTIONS ---
  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      localStorage.removeItem('erp_obras_auth');
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

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
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
        setIsProcessingDoc(false);
      };
    } catch (err) {
      setDocStatus('error');
      setIsProcessingDoc(false);
    }
  };

  const createProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: projName,
      client: projClient,
      budget: Number(projBudget),
      startDate: projDate,
      status: 'Em Execução',
      expenses: extractedData?.expenses?.map(e => ({ ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() })) || [],
      revenues: extractedData?.revenues?.map(r => ({ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() })) || [],
      plannedRevenues: extractedData?.plannedRevenues || []
    };
    setProjects([...projects, newProj]);
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
    return { budget, revenue, expenses, profit: budget - expenses };
  }, [projects]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // --- VIEWS ---
  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent)]"></div>
        <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl z-10">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-xl mb-4"><ShieldCheck size={40} className="text-white" /></div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Empreiteira Pro</h1>
            <p className="text-slate-400 font-medium">Gestão Financeira e Auditoria IA</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setAuth({ ...auth, isLoggedIn: true, companyName: loginCompany, companyKey: loginCompany.toLowerCase().trim() }); }} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Sua Empresa</label>
              <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Ex: Construtora Silva" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Chave de Acesso</label>
              <input required type="password" value={loginKey} onChange={e => setLoginKey(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-500 transition-all" />
            </div>
            <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">Acessar Sistema <ArrowRight size={18} /></button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-white flex flex-col shrink-0 z-30">
        <div className="p-8 border-b border-slate-800 flex items-center gap-3">
          <Building2 className="text-blue-500" size={28} />
          <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Gestão<br/><span className="text-blue-500">Obras</span></h1>
        </div>
        <nav className="p-6 space-y-2 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'dashboard' ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'projects' ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><HardHat size={20} /> Minhas Obras</button>
          <button onClick={async () => { setActiveView('ai'); if(!aiReport) { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); } }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === 'ai' ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><BrainCircuit size={20} /> Auditor IA</button>
        </nav>
        <div className="p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase transition-colors"><LogOut size={18} /> Encerrar Sessão</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organização</h2>
            <p className="font-black text-slate-800 uppercase text-sm">{auth.companyName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Sincronizado
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total em Contratos" value={formatBRL(summary.budget)} icon={<DollarSign size={20}/>} />
                <StatCard title="Receitas Medidas" value={formatBRL(summary.revenue)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-emerald-500" />
                <StatCard title="Despesas Totais" value={formatBRL(summary.expenses)} icon={<TrendingDown size={20}/>} colorClass="bg-white border-l-4 border-rose-500" />
                <StatCard title="Lucro Bruto" value={formatBRL(summary.profit)} icon={<BarChart3 size={20}/>} colorClass="bg-slate-900 text-white border-none" />
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-3"><TrendingUp className="text-emerald-500" /> Fluxo de Obras Recentes</h3>
                {projects.length === 0 ? (
                  <div className="py-20 text-center">
                    <HardHat size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Nenhuma obra para exibir no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm font-black text-blue-600">{p.name[0]}</div>
                          <div>
                            <h4 className="font-black text-sm uppercase">{p.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{p.client}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm">{formatBRL(p.budget)}</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Em Execução</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'projects' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Portfólio de Obras</h3>
                <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"><Plus size={20} /> Cadastrar Obra</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {projects.map(p => {
                  const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                  const pRevenue = p.revenues.reduce((s, r) => s + r.amount, 0);
                  return (
                    <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:border-blue-300 transition-all group relative">
                      <button onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                      <h4 className="font-black text-xl uppercase mb-1 truncate pr-8">{p.name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{p.client}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Custo Acumulado</p>
                          <p className="font-black text-rose-500 text-sm">{formatBRL(pExpenses)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Medido</p>
                          <p className="font-black text-emerald-600 text-sm">{formatBRL(pRevenue)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between text-[10px] font-black uppercase"><span>Progresso Financeiro</span><span>{Math.round((pRevenue/p.budget)*100)}%</span></div>
                         <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{width: `${(pRevenue/p.budget)*100}%`}}></div>
                         </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Lançar Saída</button>
                         <button onClick={() => setTransactionModal({ isOpen: true, projectId: p.id, type: 'revenue' })} className="py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Lançar Receita</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl animate-in zoom-in-95 duration-500">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-4"><BrainCircuit className="text-blue-600" size={32} /> Relatório de Auditoria IA</h3>
                  <button onClick={async () => { setIsAiLoading(true); setAiReport(await analyzeFinancials(projects)); setIsAiLoading(false); }} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600"><TrendingUp size={20} /></button>
               </div>
               <div className="prose prose-slate max-w-none prose-p:font-medium prose-p:text-slate-600 prose-headings:font-black prose-headings:uppercase leading-relaxed">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                       <Loader2 className="animate-spin text-blue-600" size={48} />
                       <p className="text-xs font-black uppercase text-slate-400 animate-pulse">O Auditor está processando suas planilhas...</p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{aiReport || "Inicie a análise clicando no botão de renovar."}</div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-xl font-black uppercase">Cadastrar Nova Obra</h3>
                 <button onClick={() => { setIsAddingProject(false); resetProjectForm(); }} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 relative text-center hover:border-blue-500 transition-colors group">
                    {isProcessingDoc ? (
                      <div className="py-6 flex flex-col items-center gap-4">
                         <Loader2 className="animate-spin text-blue-600" size={48} />
                         <p className="text-xs font-black uppercase text-blue-600 animate-pulse">Lendo PDF de Medição...</p>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center gap-3">
                           {docStatus === 'success' ? <FileCheck2 size={56} className="text-emerald-500" /> : <FileUp size={56} className={docStatus === 'error' ? 'text-rose-500' : 'text-slate-300 group-hover:text-blue-500 transition-colors'} />}
                           <p className="text-xs font-black uppercase text-slate-400">Arraste aqui o Contrato ou PDF de Medição</p>
                           {docStatus === 'success' && <span className="text-[10px] font-black text-emerald-600 uppercase">IA: Dados Extraídos com Sucesso</span>}
                        </div>
                      </>
                    )}
                 </div>
                 <form onSubmit={createProject} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <input required placeholder="Nome do Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500" />
                       <input required placeholder="Cliente" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <input required type="number" placeholder="Valor do Contrato R$" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none focus:border-blue-500" />
                       <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl flex items-center justify-center gap-3"><Save size={20} /> Salvar e Iniciar Obra</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {transactionModal.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
               <div className={`p-8 text-white flex justify-between items-center ${transactionModal.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <h3 className="text-lg font-black uppercase tracking-tighter">Lançar {transactionModal.type === 'expense' ? 'Saída' : 'Receita'}</h3>
                  <button onClick={() => setTransactionModal({ isOpen: false, projectId: null, type: 'expense' })} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  setProjects(prev => prev.map(p => {
                    if (p.id !== transactionModal.projectId) return p;
                    const item = { id: crypto.randomUUID(), description: formDesc, amount: Number(formVal), date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
                    if (transactionModal.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCat }] };
                    return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setTransactionModal({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDesc(''); setFormVal('');
               }} className="p-10 space-y-4">
                  <input required placeholder="Descrição do lançamento" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  <input required type="number" step="0.01" placeholder="Valor R$" value={formVal} onChange={e => setFormVal(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" />
                  {transactionModal.type === 'expense' && (
                    <select value={formCat} onChange={e => setFormCat(e.target.value as any)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                      <option value="Material">Material</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Comissão">Comissão</option>
                      <option value="Logística">Logística</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                  <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase shadow-lg">Confirmar Lançamento</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
