
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
import { Project, ExpenseCategory, AuthState } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials, analyzeProjectDocument } from './services/geminiService';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('gestao_obras_auth_v1');
    return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'forecast' | 'ai'>('dashboard');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docStatus, setDocStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
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
      const saved = localStorage.getItem(`gestao_obras_data_${auth.companyKey}`);
      if (saved) setProjects(JSON.parse(saved));
    }
  }, [auth]);

  useEffect(() => {
    if (auth.isLoggedIn && auth.companyKey) {
      localStorage.setItem(`gestao_obras_data_${auth.companyKey}`, JSON.stringify(projects));
    }
  }, [projects, auth.isLoggedIn, auth.companyKey]);

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      localStorage.removeItem('gestao_obras_auth_v1');
      setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
      setProjects([]);
      setActiveView('dashboard');
    }
  };

  const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDoc(true);
    setDocStatus('idle');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
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
      setIsProcessingDoc(false);
    };
    reader.onerror = () => {
      setDocStatus('error');
      setIsProcessingDoc(false);
    };
    reader.readAsDataURL(file);
  };

  const summary = useMemo(() => {
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalRevenue = projects.reduce((acc, p) => acc + p.revenues.reduce((sum, r) => sum + r.amount, 0), 0);
    const totalExpenses = projects.reduce((acc, p) => acc + p.expenses.reduce((sum, e) => sum + e.amount, 0), 0);
    return { totalBudget, totalRevenue, totalExpenses, forecastProfit: totalBudget - totalExpenses };
  }, [projects]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!auth.isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
          <div className="text-center mb-8">
            <ShieldCheck size={48} className="mx-auto text-blue-500 mb-4" />
            <h1 className="text-2xl font-black text-white uppercase">Gestão de Obras</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            setAuth({ isLoggedIn: true, companyName: loginCompany, companyKey: loginCompany.toLowerCase().trim(), userRole: 'admin' });
          }} className="space-y-6">
            <input required placeholder="Nome da Empreiteira" value={loginCompany} onChange={e => setLoginCompany(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500" />
            <input required type="password" placeholder="Chave de Acesso" value={loginKey} onChange={e => setLoginKey(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500" />
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase transition-all flex items-center justify-center gap-2">Entrar <ArrowRight size={18} /></button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <ShieldCheck size={24} className="text-blue-500" />
          <h1 className="text-sm font-black uppercase">ERP Obras</h1>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'dashboard' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={18} /> Painel</button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'projects' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><HardHat size={18} /> Minhas Obras</button>
          <button onClick={async () => { 
            setActiveView('ai'); 
            if(!aiAnalysis) { setIsAnalyzing(true); setAiAnalysis(await analyzeFinancials(projects)); setIsAnalyzing(false); }
          }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeView === 'ai' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><BrainCircuit size={18} /> Auditor IA</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase"><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between uppercase text-[10px] font-black text-slate-400 tracking-widest">
           <h2>{auth.companyName} / {activeView}</h2>
           <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Online</div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
           {activeView === 'dashboard' && (
             <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Contratos" value={formatCurrency(summary.totalBudget)} icon={<DollarSign size={20}/>} />
                <StatCard title="Recebido" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp size={20}/>} />
                <StatCard title="Total Gastos" value={formatCurrency(summary.totalExpenses)} icon={<Plus size={20}/>} colorClass="bg-white text-rose-600" />
                <StatCard title="Lucro Bruto" value={formatCurrency(summary.forecastProfit)} icon={<BarChart3 size={20}/>} colorClass="bg-slate-900 text-white" />
             </div>
           )}

           {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black uppercase">Gerenciamento de Obras</h3>
                   <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg"><Plus size={18} className="inline mr-2" /> Nova Obra</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {projects.length === 0 ? (
                     <div className="col-span-full py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <HardHat size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase text-[10px]">Nenhuma obra cadastrada.</p>
                     </div>
                   ) : projects.map(p => (
                     <div key={p.id} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group">
                        <button onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                        <h4 className="font-black text-lg uppercase mb-1">{p.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{p.client}</p>
                        <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                           <div className="flex justify-between text-[10px] font-black uppercase"><span>Contrato:</span><span>{formatCurrency(p.budget)}</span></div>
                           <div className="flex justify-between text-[10px] font-black uppercase text-rose-500"><span>Custo:</span><span>{formatCurrency(p.expenses.reduce((s,e)=>s+e.amount,0))}</span></div>
                        </div>
                        <div className="mt-6 flex gap-2">
                           <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'expense' })} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase">Gasto</button>
                           <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_paid' })} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">Receita</button>
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
                  {isAnalyzing ? <div className="animate-pulse flex items-center gap-2"><Loader2 className="animate-spin" /> Processando dados...</div> : aiAnalysis}
                </div>
             </div>
           )}
        </div>
      </main>

      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase">Adicionar Nova Obra</h3>
                 <button onClick={() => { setIsAddingProject(false); setDocStatus('idle'); }} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 relative text-center hover:border-blue-500 transition-colors">
                    {isProcessingDoc ? (
                      <div className="py-4"><Loader2 className="animate-spin text-blue-600 mx-auto" size={40} /><p className="text-xs font-black uppercase mt-4 text-blue-600">Extraindo dados do PDF...</p></div>
                    ) : (
                      <>
                        <input type="file" accept="application/pdf,image/*" onChange={handleProjectFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="flex flex-col items-center gap-3">
                           {docStatus === 'success' ? <FileCheck2 size={48} className="text-emerald-500" /> : <FileUp size={48} className={docStatus === 'error' ? 'text-rose-500' : 'text-slate-300'} />}
                           <p className="text-xs font-black uppercase text-slate-400">Importar Contrato ou Medição (PDF/IMG)</p>
                        </div>
                      </>
                    )}
                 </div>
                 <form onSubmit={(e) => {
                    e.preventDefault();
                    const newProj: Project = { id: crypto.randomUUID(), name: projName, client: projClient, budget: Number(projBudget), startDate: projDate, status: 'Em Execução', revenues: extractedData?.revenues || [], plannedRevenues: extractedData?.plannedRevenues || [], expenses: extractedData?.expenses || [] };
                    setProjects(p => [...p, newProj]);
                    setIsAddingProject(false); setProjName(''); setProjClient(''); setProjBudget('');
                 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <input required placeholder="Nome do Projeto" value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                       <input required placeholder="Cliente" value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <input required type="number" placeholder="Valor Global R$" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" />
                       <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl flex items-center justify-center gap-3"><Save size={20} /> Salvar Obra</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {genericTransaction.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
               <div className={`p-8 text-white flex justify-between items-center ${genericTransaction.type === 'expense' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <h3 className="text-lg font-black uppercase">Lançar {genericTransaction.type === 'expense' ? 'Saída' : 'Entrada'}</h3>
                  <button onClick={() => setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' })} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  setProjects(prev => prev.map(p => {
                     if (p.id !== genericTransaction.projectId) return p;
                     const item = { id: crypto.randomUUID(), description: formDescription, amount: Number(formAmount), date: formDate, createdAt: new Date().toISOString() };
                     if (genericTransaction.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCategory }] };
                     return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' });
                  setFormDescription(''); setFormAmount('');
               }} className="p-10 space-y-4">
                  <input required placeholder="Descrição" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                     <input required type="number" step="0.01" placeholder="Valor R$" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" />
                     <input required type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                  </div>
                  {genericTransaction.type === 'expense' && (
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                      <option value="Material">Material</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                  <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase">Confirmar</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
