
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
  CheckCircle2
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
import { analyzeFinancials, analyzeInvoice } from './services/geminiService';

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
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempAttachment, setTempAttachment] = useState<Attachment | null>(null);
  const [isReadingInvoice, setIsReadingInvoice] = useState(false);

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
    setIsReadingInvoice(false);
  };

  useEffect(() => {
    if (auth.isLoggedIn) {
      setSync(prev => ({ ...prev, state: 'syncing' }));
      const storageKey = `gestao_obras_data_${auth.companyKey}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        setProjects(JSON.parse(saved));
      } else {
        // SIMULAÇÃO BASEADA NO PDF ANEXO
        const simulatedProject: Project = {
          id: 'sim-pdf-2025',
          name: 'Reforma Central 2025 (Simulação PDF)',
          client: 'Secretaria Municipal de Obras',
          budget: 523102.69,
          startDate: '2025-09-03',
          status: 'Em Execução',
          revenues: [
            { id: 'rev-1', description: 'Medição Setembro/2025', amount: 32746.75, date: '2025-11-18' },
            { id: 'rev-2', description: 'Medição Outubro/2025', amount: 120104.41, date: '2026-01-08' }
          ],
          plannedRevenues: [
            { id: 'prev-1', description: 'Previsão Novembro/2025', amount: 307892.53, date: '2025-11-30' },
            { id: 'prev-2', description: 'Previsão Dezembro/2025', amount: 62359.00, date: '2025-12-31' }
          ],
          expenses: [
            { id: 'e-1', description: 'Mão de Obra Setembro', amount: 27581.00, date: '2025-09-30', category: 'Mão de Obra' },
            { id: 'e-2', description: 'Materiais Setembro', amount: 33026.60, date: '2025-09-30', category: 'Material' },
            { id: 'e-3', description: 'Serviços Terceiros Setembro', amount: 1370.22, date: '2025-09-30', category: 'Serviços Terceiros' },
            { id: 'e-4', description: 'ISS/Impostos Setembro', amount: 1964.80, date: '2025-09-30', category: 'Impostos' },
            { id: 'e-5', description: 'Mão de Obra Outubro', amount: 37556.00, date: '2025-10-31', category: 'Mão de Obra' },
            { id: 'e-6', description: 'Materiais Outubro', amount: 50132.61, date: '2025-10-31', category: 'Material' },
            { id: 'e-7', description: 'Serviços Terceiros Outubro', amount: 1700.00, date: '2025-10-31', category: 'Serviços Terceiros' },
            { id: 'e-8', description: 'ISS/Impostos Outubro', amount: 7206.26, date: '2025-10-31', category: 'Impostos' },
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

  useEffect(() => {
    localStorage.setItem('gestao_obras_auth_v1', JSON.stringify(auth));
  }, [auth]);

  const summary = useMemo(() => {
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalRevenue = projects.reduce((acc, p) => acc + p.revenues.reduce((sum, r) => sum + r.amount, 0), 0);
    const totalPlanned = projects.reduce((acc, p) => acc + (p.plannedRevenues?.reduce((sum, r) => sum + r.amount, 0) || 0), 0);
    const totalExpenses = projects.reduce((acc, p) => acc + p.expenses.reduce((sum, e) => sum + e.amount, 0), 0);
    
    const taxFactor = (1 - settings.taxRate / 100);
    const commRateFactor = (settings.commissionRate / 100);

    const totalCommissionsEarnedOnMedicao = totalRevenue * taxFactor * commRateFactor;
    const totalCommissionsOnPlanned = totalPlanned * taxFactor * commRateFactor;
    
    const totalCommissionsPaid = projects.reduce((acc, p) => 
      acc + p.expenses.filter(e => e.category === 'Comissão').reduce((sum, e) => sum + e.amount, 0), 0);
    
    const commissionBalance = totalCommissionsEarnedOnMedicao - totalCommissionsPaid;
    
    const outstandingReceivables = totalBudget - totalRevenue;
    const futureTaxes = outstandingReceivables * (settings.taxRate / 100);
    const futureCommissions = (outstandingReceivables - futureTaxes) * commRateFactor;
    
    const forecastProfit = totalBudget - totalExpenses - futureTaxes - (commissionBalance > 0 ? commissionBalance : 0) - futureCommissions;

    return { 
      totalBudget, totalRevenue, totalExpenses, totalCommissionsPaid, totalCommissionsEarnedOnMedicao,
      forecastProfit, outstandingReceivables, commissionBalance, totalCommissionsOnPlanned, totalPlanned
    };
  }, [projects, settings]);

  const allTransactions = useMemo(() => {
    const list: any[] = [];
    projects.forEach(p => {
      p.expenses.forEach(e => list.push({ ...e, type: 'Saída', color: 'rose', projectName: p.name, projectId: p.id }));
      p.revenues.forEach(r => list.push({ ...r, type: 'Receita Paga', color: 'emerald', projectName: p.name, projectId: p.id }));
      p.plannedRevenues?.forEach(pr => list.push({ ...pr, type: 'Receita Prevista', color: 'blue', projectName: p.name, projectId: p.id, rawData: pr }));
    });
    return list
      .filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projects, searchTerm]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
  };

  const handleMarkAsPaid = (projectId: string, revenue: Revenue) => {
    if(!confirm('Deseja confirmar o recebimento desta medição? Ela será movida para o campo PAGO.')) return;
    
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        plannedRevenues: p.plannedRevenues?.filter(pr => pr.id !== revenue.id) || [],
        revenues: [...p.revenues, { ...revenue, date: new Date().toISOString().split('T')[0] }]
      };
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setTempAttachment({ name: file.name, type: file.type, data: base64 });
        if (genericTransaction.type === 'expense' && !genericTransaction.transId) {
          setIsReadingInvoice(true);
          try {
            const extracted = await analyzeInvoice(base64, file.type);
            if (extracted) {
              setFormDescription(extracted.description);
              setFormAmount(extracted.amount.toString());
              setFormDate(extracted.date);
              setFormCategory(extracted.category);
            }
          } finally {
            setIsReadingInvoice(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditTransaction = (t: any) => {
    resetFormFields();
    setGenericTransaction({
      isOpen: true,
      projectId: t.projectId,
      type: t.type === 'Saída' ? 'expense' : t.type === 'Receita Paga' ? 'revenue_paid' : 'revenue_planned',
      transId: t.id
    });
    setFormDescription(t.description);
    setFormAmount(t.amount.toString());
    setFormDate(t.date);
    if (t.category) setFormCategory(t.category);
    if (t.attachment) setTempAttachment(t.attachment);
    setProjectsSubView('cards'); 
  };

  const handleEditProject = (p: Project) => {
    setEditingProjectId(p.id);
    setIsAddingProject(true);
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
            if(!aiAnalysis && !isAnalyzing) {
              setIsAnalyzing(true);
              try {
                const result = await analyzeFinancials(projects);
                setAiAnalysis(result);
              } finally {
                setIsAnalyzing(false);
              }
            }
          }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeView === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><BrainCircuit size={18} /> Auditor IA</button>
        </nav>
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 space-y-2">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-xs uppercase mt-2"><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
           <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {activeView === 'dashboard' ? 'Dashboard Global' : 
               activeView === 'projects' ? 'Gestão de Ativos' : 
               activeView === 'forecast' ? 'Análise de Margem' : 'Auditoria Inteligente'}
           </h2>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border-emerald-100">
              <Cloud size={14} /> Status: Conectado
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
           {activeView === 'dashboard' && (
             <div className="max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   <StatCard title="Total Contratos" value={formatCurrency(summary.totalBudget)} icon={<DollarSign size={20}/>} />
                   <StatCard title="Medições Pagas" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-emerald-400" />
                   <StatCard title="Saldo Comissões" value={formatCurrency(summary.commissionBalance)} icon={<Handshake size={20}/>} colorClass={summary.commissionBalance > 0 ? "bg-white border-l-4 border-indigo-500" : "bg-white border-l-4 border-slate-200"} />
                   <StatCard title="Lucro Projetado" value={formatCurrency(summary.forecastProfit)} icon={<BarChart3 size={20}/>} colorClass="bg-slate-900 text-white border-none" />
                </div>
             </div>
           )}

           {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestão Operacional</h3>
                   <div className="flex bg-slate-200 p-1.5 rounded-2xl gap-1">
                      <button onClick={() => setProjectsSubView('cards')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${projectsSubView === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Cards Obras</button>
                      <button onClick={() => setProjectsSubView('history')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${projectsSubView === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Extrato Geral</button>
                   </div>
                   <button onClick={() => { setEditingProjectId(null); resetFormFields(); setIsAddingProject(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg uppercase text-xs transition-all"><Plus size={18} /> Nova Obra</button>
                </div>

                {projectsSubView === 'cards' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-200 transition-all">
                         <div className="p-8 flex-1">
                            <h4 className="font-black text-lg text-slate-900 truncate mb-1">{p.name}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.client}</p>
                            <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                               <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Total Contrato</span><span className="text-slate-900">{formatCurrency(p.budget)}</span></div>
                               <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-emerald-400">Medição Paga</span><span className="text-emerald-600">{formatCurrency(p.revenues.reduce((s,r)=>s+r.amount, 0))}</span></div>
                               <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-blue-400">Medição Prevista</span><span className="text-blue-600">{formatCurrency(p.plannedRevenues?.reduce((s,r)=>s+r.amount, 0) || 0)}</span></div>
                            </div>
                         </div>
                         <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                            <button onClick={() => { resetFormFields(); setGenericTransaction({ isOpen: true, projectId: p.id, type: 'expense', transId: null }); }} className="py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase">Saída</button>
                            <button onClick={() => { resetFormFields(); setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_planned', transId: null }); }} className="py-2 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase">Prevista</button>
                            <button onClick={() => { resetFormFields(); setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue_paid', transId: null }); }} className="py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase">Paga</button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                              <tr>
                                 <th className="px-8 py-5">Tipo</th>
                                 <th className="px-8 py-5">Data</th>
                                 <th className="px-8 py-5">Obra</th>
                                 <th className="px-8 py-5">Descrição</th>
                                 <th className="px-8 py-5 text-right">Valor</th>
                                 <th className="px-8 py-5 text-center">Ações</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {allTransactions.map(t => (
                                 <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4">
                                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                          t.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                          t.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                       }`}>{t.type}</span>
                                    </td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-8 py-4 text-xs font-black text-slate-900 uppercase">{t.projectName}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-700">{t.description}</td>
                                    <td className={`px-8 py-4 text-right font-black text-sm ${t.color === 'rose' ? 'text-rose-600' : t.color === 'emerald' ? 'text-emerald-600' : 'text-blue-600'}`}>{formatCurrency(t.amount)}</td>
                                    <td className="px-8 py-4 text-center">
                                       <div className="flex items-center justify-center gap-1">
                                          {t.type === 'Receita Prevista' && (
                                            <button onClick={() => handleMarkAsPaid(t.projectId, t.rawData)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg title='Confirmar Recebimento'"><CheckCircle2 size={18} /></button>
                                          )}
                                          <button onClick={() => handleEditTransaction(t)} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg"><Edit2 size={16} /></button>
                                          <button onClick={() => deleteTransaction(t.projectId, t.id, t.type)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg"><Trash2 size={16} /></button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}
             </div>
           )}

           {activeView === 'forecast' && (
              <div className="max-w-7xl mx-auto space-y-8">
                 <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                       <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter">Relatório Estratégico de Comissões</h3>
                          <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">Regra: Comissão calculada sobre (Receita - Imposto {settings.taxRate}%)</p>
                       </div>
                       <div className="p-3 bg-slate-800 rounded-2xl"><Handshake size={24} className="text-emerald-400" /></div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b">
                            <tr>
                               <th className="px-8 py-5">Obra</th>
                               <th className="px-8 py-5 text-right">Medições Pagas</th>
                               <th className="px-8 py-5 text-right">Comissão Devida (Pagas)</th>
                               <th className="px-8 py-5 text-right">Comissão Paga (Caixa)</th>
                               <th className="px-8 py-5 text-right">Medições Previstas</th>
                               <th className="px-8 py-5 text-right">Comissão Estimada (Previsto)</th>
                               <th className="px-8 py-5 text-right">Saldo a Pagar Total</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {projects.map(p => {
                               const revPaid = p.revenues.reduce((s,r)=>s+r.amount, 0);
                               const revPlanned = p.plannedRevenues?.reduce((s,r)=>s+r.amount, 0) || 0;
                               const taxFactor = (1 - settings.taxRate / 100);
                               const commFactor = settings.commissionRate / 100;
                               
                               const commEarnedPaid = revPaid * taxFactor * commFactor;
                               const commEstimatedPlanned = revPlanned * taxFactor * commFactor;
                               const commPaidCaixa = p.expenses.filter(e => e.category === 'Comissão').reduce((s,e)=>s+e.amount, 0);
                               const balanceTotal = (commEarnedPaid + commEstimatedPlanned) - commPaidCaixa;

                               return (
                                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                                     <td className="px-8 py-6 font-black text-slate-800">{p.name}</td>
                                     <td className="px-8 py-6 text-right font-bold text-slate-500">{formatCurrency(revPaid)}</td>
                                     <td className="px-8 py-6 text-right font-bold text-emerald-500">{formatCurrency(commEarnedPaid)}</td>
                                     <td className="px-8 py-6 text-right font-bold text-rose-500">{formatCurrency(commPaidCaixa)}</td>
                                     <td className="px-8 py-6 text-right font-bold text-blue-500">{formatCurrency(revPlanned)}</td>
                                     <td className="px-8 py-6 text-right font-bold text-blue-600">{formatCurrency(commEstimatedPlanned)}</td>
                                     <td className={`px-8 py-6 text-right font-black ${balanceTotal > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{formatCurrency(balanceTotal)}</td>
                                  </tr>
                               )
                            })}
                         </tbody>
                      </table>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </main>

      {/* Modal Lançamento */}
      {genericTransaction.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className={`p-8 text-white flex justify-between items-center ${genericTransaction.type === 'expense' ? 'bg-slate-900' : genericTransaction.type === 'revenue_paid' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  <h3 className="text-xl font-black uppercase tracking-widest">{genericTransaction.transId ? 'Editar' : 'Novo Lançamento'}</h3>
                  <button onClick={() => { setGenericTransaction({ isOpen: false, projectId: null, type: 'expense', transId: null }); resetFormFields(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(formAmount);
                  const isEditing = !!genericTransaction.transId;
                  setProjects(prev => prev.map(p => {
                     if (p.id !== genericTransaction.projectId) return p;
                     if (genericTransaction.type === 'expense') {
                        const newExpense = { id: isEditing ? genericTransaction.transId! : crypto.randomUUID(), description: formDescription, amount, date: formDate, category: formCategory, attachment: tempAttachment || undefined };
                        return { ...p, expenses: isEditing ? p.expenses.map(exp => exp.id === genericTransaction.transId ? newExpense : exp) : [...p.expenses, newExpense] };
                     } else if (genericTransaction.type === 'revenue_planned') {
                        const newPlanned = { id: isEditing ? genericTransaction.transId! : crypto.randomUUID(), description: formDescription, amount, date: formDate };
                        return { ...p, plannedRevenues: isEditing ? (p.plannedRevenues || []).map(rev => rev.id === genericTransaction.transId ? newPlanned : rev) : [...(p.plannedRevenues || []), newPlanned] };
                     } else {
                        const newPaid = { id: isEditing ? genericTransaction.transId! : crypto.randomUUID(), description: formDescription, amount, date: formDate };
                        return { ...p, revenues: isEditing ? p.revenues.map(rev => rev.id === genericTransaction.transId ? newPaid : rev) : [...p.revenues, newPaid] };
                     }
                  }));
                  setGenericTransaction({ isOpen: false, projectId: null, type: 'expense', transId: null });
                  resetFormFields(); 
               }} className="p-10 space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase">Descrição</label>
                     <input required value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Medição Nov/2025" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Valor R$</label>
                        <input required type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                        <input required type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                     </div>
                  </div>
                  {genericTransaction.type === 'expense' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
                      <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none">
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Comissão">Comissão / Sócios</option>
                        <option value="Impostos">Impostos / ISS</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  )}
                  <button type="submit" className="w-full py-5 text-white font-black rounded-2xl uppercase shadow-xl bg-slate-900 hover:bg-slate-800">Confirmar Lançamento</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
