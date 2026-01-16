
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
  ArrowRight
} from 'lucide-react';
import { Project, Revenue, ExpenseCategory, AuthState } from './types.ts';
import { StatCard } from './components/StatCard.tsx';
import { analyzeFinancials, analyzeProjectDocument } from './services/geminiService.ts';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem('gestao_obras_auth_v1');
      return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
    } catch {
      return { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
    }
  });

  const [settings] = useState(() => ({ taxRate: 6, commissionRate: 15 }));
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'forecast' | 'ai'>('dashboard');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docStatus, setDocStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');

  const [loginCompany, setLoginCompany] = useState('');
  const [loginKey, setLoginKey] = useState('');

  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);
  const [extractedData, setExtractedData] = useState<Partial<Project> | null>(null);

  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Material');
  
  const [genericTransaction, setGenericTransaction] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    type: 'expense' | 'revenue_paid';
  }>({ isOpen: false, projectId: null, type: 'expense' });
  
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (auth.isLoggedIn) {
      localStorage.setItem('gestao_obras_auth_v1', JSON.stringify(auth));
      const storageKey = `gestao_obras_data_${auth.companyKey}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setProjects(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar projetos:", e);
        }
      }
    }
  }, [auth]);

  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem(`gestao_obras_data_${auth.companyKey}`, JSON.stringify(projects));
    }
  }, [projects, auth]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCompany && loginKey) {
      setAuth({
        isLoggedIn: true,
        companyName: loginCompany,
        companyKey: loginKey.toLowerCase().trim().replace(/\s/g, '_'),
        userRole: 'admin'
      });
    }
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      localStorage.removeItem('gestao_obras_auth_v1');
      setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
      setProjects([]);
      setAiAnalysis('');
      setActiveView('dashboard');
    }
  };

  const summary = useMemo(() => {
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalRevenue = projects.reduce((acc, p) => acc + p.revenues.reduce((sum, r) => sum + r.amount, 0), 0);
    const totalExpenses = projects.reduce((acc, p) => acc + p.expenses.reduce((sum, e) => sum + e.amount, 0), 0);
    const taxFactor = (1 - settings.taxRate / 100);
    const commRateFactor = (settings.commissionRate / 100);
    const totalCommissionsEarned = totalRevenue * taxFactor * commRateFactor;
    const totalCommissionsPaid = projects.reduce((acc, p) => acc + p.expenses.filter(e => e.category === 'Comissão').reduce((sum, e) => sum + e.amount, 0), 0);
    const forecastProfit = totalBudget - totalExpenses;

    return { totalBudget, totalRevenue, totalExpenses, commissionBalance: totalCommissionsEarned - totalCommissionsPaid, forecastProfit };
  }, [projects, settings]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDoc(true);
    setDocStatus('idle');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const data = await analyzeProjectDocument(base64, file.type);
        if (data) {
          setProjName(data.name || '');
          setProjClient(data.client || '');
          setProjBudget(data.budget?.toString() || '');
          if (data.startDate) setProjDate(data.startDate);
          setExtractedData(data);
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
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projName,
      client: projClient,
      budget: Number(projBudget),
      startDate: projDate,
      status: 'Em Execução',
      revenues: (extractedData?.revenues || []).map((r: any) => ({ ...r, id: crypto.randomUUID(), createdAt: now })),
      plannedRevenues: (extractedData?.plannedRevenues || []).map((r: any) => ({ ...r, id: crypto.randomUUID(), createdAt: now })),
      expenses: (extractedData?.expenses || []).map((e: any) => ({ ...e, id: crypto.randomUUID(), createdAt: now, category: e.category || 'Outros' }))
    };

    setProjects(prev => [...prev, newProject]);
    resetProjectFields();
  };

  const resetProjectFields = () => {
    setProjName(''); setProjClient(''); setProjBudget('');
    setProjDate(new Date().toISOString().split('T')[0]);
    setIsAddingProject(false); setIsProcessingDoc(false);
    setDocStatus('idle'); setExtractedData(null);
  };

  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-xl mb-6">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Obras</h1>
            <p className="text-slate-400 font-medium mt-2">ERP Profissional para Empreiteiras</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input required value={loginCompany} onChange={e => setLoginCompany(e.target.value)} placeholder="Sua Construtora LTDA" className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Chave de Acesso</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input required type="password" value={loginKey} onChange={e => setLoginKey(e.target.value)} placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-slate-600" />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase shadow-lg transition-all flex items-center justify-center gap-3 group">
              Acessar Painel <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl"><ShieldCheck size={24} /></div>
          <div><h1 className="text-sm font-black uppercase">Gestão Obras</h1></div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'dashboard' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={18} /> Dashboard</button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'projects' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><HardHat size={18} /> Obras</button>
          <button onClick={() => setActiveView('forecast')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'forecast' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><BarChart3 size={18} /> Projeção</button>
          <button onClick={async () => { 
            setActiveView('ai'); 
            if(!aiAnalysis) { setIsAnalyzing(true); setAiAnalysis(await analyzeFinancials(projects)); setIsAnalyzing(false); }
          }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'ai' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><BrainCircuit size={18} /> Auditor IA</button>
        </nav>
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase"><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <h2>{activeView} / {auth.companyName}</h2>
           <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 uppercase">Status: Online</div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
           {activeView === 'dashboard' && (
             <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Contratos" value={formatCurrency(summary.totalBudget)} icon={<DollarSign size={20}/>} />
                <StatCard title="Recebido" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-emerald-400" />
                <StatCard title="Saldo Comissões" value={formatCurrency(summary.commissionBalance)} icon={<Handshake size={20}/>} colorClass="bg-white border-l-4 border-indigo-500" />
                <StatCard title="Lucro Bruto" value={formatCurrency(summary.forecastProfit)} icon={<BarChart3 size={20}/>} colorClass="bg-slate-900 text-white border-none" />
             </div>
           )}

           {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-black uppercase">Gestão Operacional</h3>
                   <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg uppercase text-xs"><Plus size={18} /> Nova Obra</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-300">
                      <HardHat size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhuma obra cadastrada.</p>
                    </div>
                  ) : projects.map(p => (
                    <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                       <div className="flex justify-between items-start mb-1">
                         <h4 className="font-black text-lg truncate uppercase">{p.name}</h4>
                         <button onClick={() => { if(confirm('Excluir obra?')) setProjects(prev => prev.filter(x => x.id !== p.id)) }} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{p.client}</p>
                       <div className="space-y-2 bg-slate-50 p-4 rounded-2xl">
                          <div className="flex justify-between text-[10px] font-black uppercase"><span>Contrato</span><span>{formatCurrency(p.budget)}</span></div>
                          <div className="flex justify-between text-[10px] font-black uppercase text-emerald-600"><span>Custo Real</span><span>{formatCurrency(p.expenses.reduce((s,e)=>s+e.amount,0))}</span></div>
                       </div>
                       <div className="mt-6 grid grid-cols-2 gap-2">
                          <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase">Lançar Saída</button>
                          <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_paid' })} className="py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase">Lançar Medição</button>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
           )}

           {activeView === 'ai' && (
             <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
                <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3"><BrainCircuit className="text-blue-600" /> Auditoria IA</h3>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                  {isAnalyzing ? <div className="animate-pulse flex items-center gap-2"><Loader2 className="animate-spin" /> Analisando...</div> : aiAnalysis}
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Modal Nova Obra */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-xl font-black uppercase tracking-widest">Nova Obra</h3>
                 <button onClick={resetProjectFields} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto flex-1">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 relative group text-center cursor-pointer">
                    {isProcessingDoc ? (
                      <div className="flex flex-col items-center gap-4 py-4">
                         <Loader2 className="animate-spin text-blue-600" size={40} />
                         <p className="text-xs font-black uppercase text-blue-600 tracking-widest">IA Analisando...</p>
                      </div>
                    ) : (
                      <>
                        <input type="file" accept="application/pdf,image/*" onChange={handleProjectFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center gap-3">
                           {docStatus === 'success' ? <FileCheck2 size={48} className="text-emerald-500" /> : <FileUp size={48} className={`${docStatus === 'error' ? 'text-rose-500' : 'text-slate-300'}`} />}
                           <p className="text-xs font-black uppercase text-slate-400">Arraste Medição/Contrato (PDF/IMG)</p>
                        </div>
                      </>
                    )}
                 </div>
                 <form onSubmit={handleCreateProject} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <input required placeholder="Nome do Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                       <input required placeholder="Cliente" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <input required type="number" placeholder="Valor Global (R$)" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" />
                       <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3">
                       <Save size={20} /> Salvar Projeto
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Modal Transação */}
      {genericTransaction.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className={`p-8 text-white flex justify-between items-center ${genericTransaction.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <h3 className="text-xl font-black uppercase">Lançar {genericTransaction.type === 'expense' ? 'Saída' : 'Receita'}</h3>
                  <button onClick={() => setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' })} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const now = new Date().toISOString();
                  setProjects(prev => prev.map(p => {
                     if (p.id !== genericTransaction.projectId) return p;
                     const item = { id: crypto.randomUUID(), description: formDescription, amount: Number(formAmount), date: formDate, createdAt: now };
                     if (genericTransaction.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCategory }] };
                     return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDescription(''); setFormAmount('');
               }} className="p-10 space-y-6">
                  <input required placeholder="Descrição" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                     <input required type="number" step="0.01" placeholder="Valor R$" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" />
                     <input required type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  </div>
                  {genericTransaction.type === 'expense' && (
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as ExpenseCategory)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                      <option value="Material">Material</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Comissão">Comissão</option>
                      <option value="Impostos">Impostos</option>
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
