
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  HardHat, 
  TrendingUp, 
  Wallet, 
  Plus, 
  Trash2, 
  Search, 
  ChevronRight, 
  AlertCircle,
  BrainCircuit,
  PieChart as PieChartIcon,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Clock,
  FileText,
  X,
  Percent,
  Info,
  Scale,
  Edit2,
  ArrowDownCircle,
  ArrowUpCircle,
  Upload,
  Paperclip,
  Eye,
  History,
  Users,
  Check,
  TrendingDown,
  Calculator,
  HandCoins,
  Cloud,
  CloudOff,
  CloudSync,
  LogOut,
  Lock,
  Building2,
  KeyRound,
  ShieldCheck,
  Monitor,
  Download,
  Database,
  Settings,
  CalendarClock,
  Filter,
  ListOrdered,
  FileSearch,
  ImageIcon,
  Loader2,
  Sparkles,
  Save,
  Receipt,
  Handshake,
  CheckCircle2,
  FileUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  ComposedChart
} from 'recharts';
import { Project, Expense, Revenue, ExpenseCategory, Attachment, AuthState, SyncStatus } from './types';
import { StatCard } from './components/StatCard';
import { analyzeFinancials, analyzeInvoice, analyzeProjectDocument } from './services/geminiService';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('gestao_obras_auth_v1');
    return saved ? JSON.parse(saved) : { isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' };
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(`gestao_obras_settings_${auth.companyKey}`);
    return saved ? JSON.parse(saved) : { taxRate: 6, commissionRate: 15 };
  });

  const [sync, setSync] = useState<SyncStatus>({ lastSync: null, state: 'synced' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'projects' | 'forecast' | 'ai'>('dashboard');
  const [projectsSubView, setProjectsSubView] = useState<'cards' | 'history'>('cards');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempAttachment, setTempAttachment] = useState<Attachment | null>(null);

  // Form de Projeto
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projDate, setProjDate] = useState(new Date().toISOString().split('T')[0]);

  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Material');
  
  const [genericTransaction, setGenericTransaction] = useState<{ 
    isOpen: boolean; 
    projectId: string | null; 
    type: 'expense' | 'revenue_paid' | 'revenue_planned';
    transId?: string | null;
  }>({ isOpen: false, projectId: null, type: 'expense', transId: null });
  
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetFormFields = () => {
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Material');
    setTempAttachment(null);
  };

  const resetProjectFields = () => {
    setProjName('');
    setProjClient('');
    setProjBudget('');
    setProjDate(new Date().toISOString().split('T')[0]);
    setIsAddingProject(false);
    setIsProcessingDoc(false);
  };

  useEffect(() => {
    if (auth.isLoggedIn) {
      setSync(prev => ({ ...prev, state: 'syncing' }));
      const storageKey = `gestao_obras_data_${auth.companyKey}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        setProjects(JSON.parse(saved));
      } else {
        const now = new Date().toISOString();
        const simulatedProject: Project = {
          id: 'sim-pdf-2025',
          name: 'Reforma Central 2025 (Simulação PDF)',
          client: 'Secretaria Municipal de Obras',
          budget: 523102.69,
          startDate: '2025-09-03',
          status: 'Em Execução',
          revenues: [
            { id: 'rev-1', description: 'Medição Setembro/2025', amount: 32746.75, date: '2025-11-18', createdAt: now },
            { id: 'rev-2', description: 'Medição Outubro/2025', amount: 120104.41, date: '2026-01-08', createdAt: now }
          ],
          plannedRevenues: [
            { id: 'prev-1', description: 'Previsão Novembro/2025', amount: 307892.53, date: '2025-11-30', createdAt: now },
            { id: 'prev-2', description: 'Previsão Dezembro/2025', amount: 62359.00, date: '2025-12-31', createdAt: now }
          ],
          expenses: [
            { id: 'e-1', description: 'Mão de Obra Setembro', amount: 27581.00, date: '2025-09-30', category: 'Mão de Obra', createdAt: now },
            { id: 'e-2', description: 'Materiais Setembro', amount: 33026.60, date: '2025-09-30', category: 'Material', createdAt: now },
            { id: 'e-3', description: 'ISS/Impostos Setembro', amount: 1964.80, date: '2025-09-30', category: 'Impostos', createdAt: now },
          ]
        };
        setProjects([simulatedProject]);
      }
      setTimeout(() => setSync({ lastSync: new Date(), state: 'synced' }), 600);
    }
  }, [auth.isLoggedIn, auth.companyKey]);

  useEffect(() => {
    if (auth.isLoggedIn && projects.length >= 0) {
      const storageKey = `gestao_obras_data_${auth.companyKey}`;
      localStorage.setItem(storageKey, JSON.stringify(projects));
      localStorage.setItem(`gestao_obras_settings_${auth.companyKey}`, JSON.stringify(settings));
      setSync({ lastSync: new Date(), state: 'synced' });
    }
  }, [projects, auth.isLoggedIn, auth.companyKey, settings]);

  const summary = useMemo(() => {
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalRevenue = projects.reduce((acc, p) => acc + p.revenues.reduce((sum, r) => sum + r.amount, 0), 0);
    const totalPlanned = projects.reduce((acc, p) => acc + (p.plannedRevenues?.reduce((sum, r) => sum + r.amount, 0) || 0), 0);
    const totalExpenses = projects.reduce((acc, p) => acc + p.expenses.reduce((sum, e) => sum + e.amount, 0), 0);
    const taxFactor = (1 - settings.taxRate / 100);
    const commRateFactor = (settings.commissionRate / 100);
    const totalCommissionsEarnedOnMedicao = totalRevenue * taxFactor * commRateFactor;
    const totalCommissionsPaid = projects.reduce((acc, p) => acc + p.expenses.filter(e => e.category === 'Comissão').reduce((sum, e) => sum + e.amount, 0), 0);
    const commissionBalance = totalCommissionsEarnedOnMedicao - totalCommissionsPaid;
    const outstandingReceivables = totalBudget - totalRevenue;
    const futureTaxes = outstandingReceivables * (settings.taxRate / 100);
    const futureCommissions = (outstandingReceivables - futureTaxes) * commRateFactor;
    const forecastProfit = totalBudget - totalExpenses - futureTaxes - (commissionBalance > 0 ? commissionBalance : 0) - futureCommissions;

    return { totalBudget, totalRevenue, totalExpenses, totalCommissionsPaid, totalCommissionsEarnedOnMedicao, forecastProfit, outstandingReceivables, commissionBalance, totalPlanned };
  }, [projects, settings]);

  const allTransactions = useMemo(() => {
    const list: any[] = [];
    projects.forEach(p => {
      p.expenses.forEach(e => list.push({ ...e, type: 'Saída', color: 'rose', projectName: p.name, projectId: p.id }));
      p.revenues.forEach(r => list.push({ ...r, type: 'Receita Paga', color: 'emerald', projectName: p.name, projectId: p.id }));
      p.plannedRevenues?.forEach(pr => list.push({ ...pr, type: 'Receita Prevista', color: 'blue', projectName: p.name, projectId: p.id, rawData: pr }));
    });
    return list
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [projects, searchTerm]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleMarkAsPaid = (projectId: string, revenue: Revenue) => {
    if(!confirm('Deseja confirmar o recebimento desta medição?')) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, plannedRevenues: p.plannedRevenues?.filter(pr => pr.id !== revenue.id) || [], revenues: [...p.revenues, { ...revenue, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() }] };
    }));
  };

  const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingDoc(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const data = await analyzeProjectDocument(base64, file.type);
          if (data) {
            if (data.name) setProjName(data.name);
            if (data.client) setProjClient(data.client);
            if (data.budget) setProjBudget(data.budget.toString());
            if (data.startDate) setProjDate(data.startDate);
            (window as any)._extractedProjectData = data;
          }
        } finally {
          setIsProcessingDoc(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = (window as any)._extractedProjectData || {};
    const now = new Date().toISOString();
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projName,
      client: projClient,
      budget: Number(projBudget),
      startDate: projDate,
      status: 'Em Execução',
      revenues: (extracted.revenues || []).map((r: any) => ({ ...r, id: crypto.randomUUID(), createdAt: now })),
      plannedRevenues: (extracted.plannedRevenues || []).map((r: any) => ({ ...r, id: crypto.randomUUID(), createdAt: now })),
      expenses: (extracted.expenses || []).map((e: any) => ({ ...e, id: crypto.randomUUID(), createdAt: now, category: e.category || 'Outros' }))
    };

    setProjects(prev => [...prev, newProject]);
    resetProjectFields();
    (window as any)._extractedProjectData = null;
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Atenção: Todos os dados desta obra (gastos e receitas) serão excluídos permanentemente. Deseja continuar?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const deleteTransaction = (projectId: string, transId: string, type: string) => {
    if(!confirm('Deseja excluir este lançamento?')) return;
    setProjects(prev => prev.map(p => {
      if(p.id !== projectId) return p;
      if(type === 'Saída') return { ...p, expenses: p.expenses.filter(e => e.id !== transId) };
      if(type === 'Receita Paga') return { ...p, revenues: p.revenues.filter(r => r.id !== transId) };
      if(type === 'Receita Prevista') return { ...p, plannedRevenues: p.plannedRevenues?.filter(pr => pr.id !== transId) || [] };
      return p;
    }));
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl"><ShieldCheck size={24} /></div>
          <div><h1 className="text-sm font-black tracking-tighter leading-tight uppercase">Gestão Obras</h1><p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Controle Central</p></div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={18} /> Dashboard</button>
          <button onClick={() => setActiveView('projects')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeView === 'projects' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><HardHat size={18} /> Obras</button>
          <button onClick={() => setActiveView('forecast')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeView === 'forecast' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><BarChart3 size={18} /> Projeção</button>
          <button onClick={async () => { 
            setActiveView('ai'); 
            if(!aiAnalysis && !isAnalyzing) { setIsAnalyzing(true); try { setAiAnalysis(await analyzeFinancials(projects)); } finally { setIsAnalyzing(false); } }
          }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeView === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><BrainCircuit size={18} /> Auditor IA</button>
        </nav>
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 space-y-2">
           <button onClick={() => setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' })} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs uppercase mt-2"><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 uppercase text-[10px] font-black tracking-widest text-slate-400">
           <h2>{activeView} / {auth.companyName}</h2>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px] font-black">Status: Online</div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
           {activeView === 'dashboard' && (
             <div className="max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <StatCard title="Contratos" value={formatCurrency(summary.totalBudget)} icon={<DollarSign size={20}/>} />
                   <StatCard title="Recebido" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-emerald-400" />
                   <StatCard title="Saldo Comissões" value={formatCurrency(summary.commissionBalance)} icon={<Handshake size={20}/>} colorClass="bg-white border-l-4 border-indigo-500" />
                   <StatCard title="Lucro Projetado" value={formatCurrency(summary.forecastProfit)} icon={<BarChart3 size={20}/>} colorClass="bg-slate-900 text-white border-none" />
                </div>
             </div>
           )}

           {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <h3 className="text-2xl font-black text-slate-900 uppercase">Gestão Operacional</h3>
                   <div className="flex bg-slate-200 p-1.5 rounded-2xl gap-1">
                      <button onClick={() => setProjectsSubView('cards')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase ${projectsSubView === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Cards</button>
                      <button onClick={() => setProjectsSubView('history')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase ${projectsSubView === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Extrato</button>
                   </div>
                   <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg uppercase text-xs transition-all"><Plus size={18} /> Nova Obra</button>
                </div>

                {projectsSubView === 'cards' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:border-blue-200 transition-all relative group/card">
                         <div className="flex justify-between items-start mb-1">
                           <h4 className="font-black text-lg text-slate-900 truncate uppercase tracking-tight flex-1">{p.name}</h4>
                           <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Excluir Obra">
                             <Trash2 size={16} />
                           </button>
                         </div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{p.client}</p>
                         <div className="space-y-2 bg-slate-50 p-4 rounded-2xl">
                            <div className="flex justify-between text-[10px] font-black uppercase"><span>Contrato</span><span className="text-slate-900">{formatCurrency(p.budget)}</span></div>
                            <div className="flex justify-between text-[10px] font-black uppercase text-emerald-600"><span>Med. Pago</span><span>{formatCurrency(p.revenues.reduce((s,r)=>s+r.amount,0))}</span></div>
                         </div>
                         <div className="mt-6 grid grid-cols-3 gap-2">
                            <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-2.5 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest">Saída</button>
                            <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_planned' })} className="py-2.5 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest">Prevista</button>
                            <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_paid' })} className="py-2.5 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest">Paga</button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                          <tr>
                             <th className="px-8 py-5">Lançamento</th>
                             <th className="px-8 py-5">Vencimento</th>
                             <th className="px-8 py-5">Tipo</th>
                             <th className="px-8 py-5">Obra</th>
                             <th className="px-8 py-5 text-right">Valor</th>
                             <th className="px-8 py-5 text-center">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {allTransactions.map(t => (
                             <tr key={t.id} className="hover:bg-slate-50/50">
                                <td className="px-8 py-4 text-[10px] font-black text-blue-600">{t.createdAt ? new Date(t.createdAt).toLocaleString('pt-BR') : '-'}</td>
                                <td className="px-8 py-4 text-xs font-bold text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                <td className="px-8 py-4"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${t.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' : t.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{t.type}</span></td>
                                <td className="px-8 py-4 text-xs font-black uppercase text-slate-900">{t.projectName}</td>
                                <td className={`px-8 py-4 text-right font-black ${t.color === 'rose' ? 'text-rose-600' : t.color === 'emerald' ? 'text-emerald-600' : 'text-blue-600'}`}>{formatCurrency(t.amount)}</td>
                                <td className="px-8 py-4 text-center">
                                   <div className="flex items-center justify-center gap-1">
                                      {t.type === 'Receita Prevista' && <button onClick={() => handleMarkAsPaid(t.projectId, t.rawData)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={18} /></button>}
                                      <button onClick={() => deleteTransaction(t.projectId, t.id, t.type)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><Trash2 size={16} /></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
                )}
             </div>
           )}

           {activeView === 'forecast' && (
             <div className="max-w-7xl mx-auto space-y-6">
               <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Projeção Estratégica por Obra</h3>
                        <p className="text-blue-400 text-[9px] font-black uppercase mt-1 tracking-widest">Base de Cálculo: Impostos {settings.taxRate}% | Comissão {settings.commissionRate}%</p>
                     </div>
                     <Handshake size={32} className="text-blue-400 opacity-50" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                       <thead className="bg-slate-50 font-black uppercase border-b text-slate-400">
                          <tr>
                             <th className="px-4 py-5">Obra</th>
                             <th className="px-4 py-5 text-right">Valor Global</th>
                             <th className="px-4 py-5 text-right font-black text-slate-700">Custo Real</th>
                             <th className="px-4 py-5 text-right">Med. Paga</th>
                             <th className="px-4 py-5 text-right text-rose-500">Imposto Pago</th>
                             <th className="px-4 py-5 text-right">Med. Prevista</th>
                             <th className="px-4 py-5 text-right">Comis. Paga</th>
                             <th className="px-4 py-5 text-right">Comis. Prevista</th>
                             <th className="px-4 py-5 text-right bg-slate-100/50">Lucro Previsto</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {projects.map(p => {
                             const taxFactor = settings.taxRate / 100;
                             const commFactor = settings.commissionRate / 100;
                             
                             const custoDaObra = p.expenses.reduce((s,e)=>s+e.amount,0);
                             const medPaga = p.revenues.reduce((s,r)=>s+r.amount,0);
                             const impostoPago = medPaga * taxFactor;
                             const medPrev = p.plannedRevenues?.reduce((s,r)=>s+r.amount,0) || 0;
                             
                             const comisPaga = p.expenses.filter(e => e.category === 'Comissão').reduce((s,e)=>s+e.amount, 0);
                             const totalComisDevida = (p.budget * (1 - taxFactor)) * commFactor;
                             const comisRestante = Math.max(0, totalComisDevida - comisPaga);
                             
                             const impostosTotalBudget = p.budget * taxFactor;
                             const gastosOperacionais = p.expenses.filter(e => e.category !== 'Comissão' && e.category !== 'Impostos').reduce((s,e)=>s+e.amount,0);
                             
                             const lucroProjetado = p.budget - impostosTotalBudget - totalComisDevida - gastosOperacionais;

                             return (
                                <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                                   <td className="px-4 py-6 font-black text-slate-900 uppercase">{p.name}</td>
                                   <td className="px-4 py-6 text-right font-bold text-slate-400">{formatCurrency(p.budget)}</td>
                                   <td className="px-4 py-6 text-right font-black text-slate-700">{formatCurrency(custoDaObra)}</td>
                                   <td className="px-4 py-6 text-right font-bold text-emerald-600">{formatCurrency(medPaga)}</td>
                                   <td className="px-4 py-6 text-right font-bold text-rose-500">{formatCurrency(impostoPago)}</td>
                                   <td className="px-4 py-6 text-right font-bold text-blue-600">{formatCurrency(medPrev)}</td>
                                   <td className="px-4 py-6 text-right font-bold text-rose-500">{formatCurrency(comisPaga)}</td>
                                   <td className="px-4 py-6 text-right font-bold text-orange-500">{formatCurrency(comisRestante)}</td>
                                   <td className="px-4 py-6 text-right font-black text-indigo-600 bg-indigo-50/20">{formatCurrency(lucroProjetado)}</td>
                                </tr>
                             )
                          })}
                       </tbody>
                    </table>
                  </div>
               </div>
             </div>
           )}

           {activeView === 'ai' && (
             <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl mt-4">
                <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 tracking-tighter"><BrainCircuit className="text-blue-600" /> Auditoria Inteligente</h3>
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium prose prose-slate max-w-none">
                  {aiAnalysis || <div className="flex items-center gap-4 animate-pulse"><Loader2 className="animate-spin" /> Gerando relatório...</div>}
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Modal Nova Obra */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-widest">Nova Obra / Contrato</h3>
                 <button onClick={resetProjectFields} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 relative group hover:border-blue-400 transition-all text-center">
                    {isProcessingDoc ? (
                      <div className="flex flex-col items-center gap-4 py-4">
                         <Loader2 className="animate-spin text-blue-600" size={40} />
                         <p className="text-xs font-black uppercase text-blue-600 animate-pulse">IA lendo documento...</p>
                      </div>
                    ) : (
                      <>
                        <input type="file" onChange={handleProjectFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="flex flex-col items-center gap-3">
                           <FileUp size={48} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                           <p className="text-xs font-black uppercase text-slate-400">Arraste seu Relatório ou PDF aqui</p>
                           <p className="text-[9px] font-bold text-slate-300 uppercase">A IA irá preencher o formulário automaticamente</p>
                        </div>
                      </>
                    )}
                 </div>

                 <form onSubmit={handleCreateProject} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Nome do Projeto</label>
                          <input required value={projName} onChange={e => setProjName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Cliente / Órgão</label>
                          <input required value={projClient} onChange={e => setProjClient(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Valor Global R$</label>
                          <input required type="number" value={projBudget} onChange={e => setProjBudget(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Data Início</label>
                          <input required type="date" value={projDate} onChange={e => setProjDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                       </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3">
                       <Save size={20} /> Salvar Obra e Lançamentos
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Modal Genérico Transação */}
      {genericTransaction.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className={`p-8 text-white flex justify-between items-center ${genericTransaction.type === 'expense' ? 'bg-slate-900' : genericTransaction.type === 'revenue_paid' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  <h3 className="text-xl font-black uppercase tracking-widest">Novo Lançamento</h3>
                  <button onClick={() => { setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' }); resetFormFields(); }} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const now = new Date().toISOString();
                  setProjects(prev => prev.map(p => {
                     if (p.id !== genericTransaction.projectId) return p;
                     const item = { id: crypto.randomUUID(), description: formDescription, amount: Number(formAmount), date: formDate, createdAt: now };
                     if (genericTransaction.type === 'expense') return { ...p, expenses: [...p.expenses, { ...item, category: formCategory }] };
                     if (genericTransaction.type === 'revenue_planned') return { ...p, plannedRevenues: [...(p.plannedRevenues || []), item] };
                     return { ...p, revenues: [...p.revenues, item] };
                  }));
                  setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' });
                  resetFormFields(); 
               }} className="p-10 space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase">Descrição</label>
                     <input required value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Ex: Medição Nov/2025" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Valor R$</label>
                        <input required type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                        <input required type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                     </div>
                  </div>
                  {genericTransaction.type === 'expense' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
                      <select value={formCategory} onChange={e => setFormCategory(e.target.value as ExpenseCategory)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Comissão">Comissão</option>
                        <option value="Impostos">Impostos</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
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
