
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
  Settings
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
import { analyzeFinancials } from './services/geminiService';

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
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [genericTransaction, setGenericTransaction] = useState<{ isOpen: boolean; projectId: string | null; type: 'expense' | 'revenue' }>({ isOpen: false, projectId: null, type: 'expense' });
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (auth.isLoggedIn) {
      setSync(prev => ({ ...prev, state: 'syncing' }));
      const storageKey = `gestao_obras_data_${auth.companyKey}`;
      const saved = localStorage.getItem(storageKey);
      setTimeout(() => {
        setProjects(saved ? JSON.parse(saved) : []);
        setSync({ lastSync: new Date(), state: 'synced' });
      }, 600);
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
    const totalPlanned = projects.reduce((acc, p) => acc + (p.plannedRevenue || 0), 0);
    const totalExpenses = projects.reduce((acc, p) => acc + p.expenses.reduce((sum, e) => sum + e.amount, 0), 0);
    const totalRevenue = projects.reduce((acc, p) => acc + p.revenues.reduce((sum, r) => sum + r.amount, 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const outstandingReceivables = totalBudget - totalRevenue;
    
    const futureTaxes = Math.max(0, outstandingReceivables * (settings.taxRate / 100)); 
    const futureCommissions = Math.max(0, (outstandingReceivables - futureTaxes) * (settings.commissionRate / 100)); 
    const forecastProfit = totalBudget - totalExpenses - futureTaxes - futureCommissions;

    return { 
      totalBudget, totalPlanned, totalExpenses, totalRevenue, 
      netProfit, forecastProfit, outstandingReceivables, futureCommissions, futureTaxes 
    };
  }, [projects, settings]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, companyName: '', companyKey: '', userRole: 'admin' });
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `BACKUP_OBRAS_${auth.companyKey}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            setProjects(json);
            alert("Sincronização manual concluída com sucesso!");
          }
        } catch (err) {
          alert("Erro ao ler o arquivo de backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  if (!auth.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900 rounded-full blur-[150px]"></div>
        </div>
        <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-4 mb-4">
               <div className="p-5 bg-blue-600 rounded-[2.5rem] shadow-2xl rotate-12">
                 <ShieldCheck size={48} className="text-white -rotate-12" />
               </div>
               <div className="text-left">
                  <h1 className="text-3xl font-black text-white tracking-tighter leading-none">GESTÃO DE OBRAS</h1>
                  <p className="text-blue-500 font-bold tracking-[0.2em] text-xs mt-1 uppercase">Sistema ERP Professional</p>
               </div>
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 p-10 rounded-[2rem] shadow-2xl">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              setAuth({
                isLoggedIn: true,
                companyName: formData.get('companyName') as string,
                companyKey: (formData.get('companyKey') as string).toUpperCase(),
                userRole: 'admin'
              });
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Sua Empresa</label>
                  <input required name="companyName" type="text" placeholder="Nome da Empresa" className="w-full bg-slate-800/50 border border-slate-700 text-white px-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Chave ERP</label>
                  <input required name="companyKey" type="text" placeholder="CHAVE-UNICA" className="w-full bg-slate-800/50 border border-slate-700 text-white px-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Senha de Acesso</label>
                <input required name="password" type="password" placeholder="••••••••" className="w-full bg-slate-800/50 border border-slate-700 text-white px-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3">
                <Monitor size={20} /> Acessar Sistema
              </button>
            </form>
          </div>
          <p className="text-center text-slate-600 text-[10px] font-bold mt-8 uppercase tracking-widest">Atenção: Use a mesma chave para sincronizar dispositivos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl"><ShieldCheck size={24} /></div>
          <div><h1 className="text-sm font-black tracking-tighter leading-tight uppercase">Gestão de Obras</h1><p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">ERP Central</p></div>
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
           <button onClick={handleExportData} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-[10px] font-bold uppercase"><Download size={14} /> Exportar Backup</button>
           <label className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 text-[10px] font-bold uppercase cursor-pointer">
              <Upload size={14} /> Importar Backup
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
           </label>
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
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${sync.state === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
              <Cloud size={14} /> {sync.state === 'synced' ? 'Status: Conectado' : 'Sincronizando...'}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
           {activeView === 'dashboard' && (
             <div className="max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <StatCard title="Total Contratos" value={formatCurrency(summary.totalBudget)} icon={<DollarSign size={20}/>} />
                   <StatCard title="Total Previsto" value={formatCurrency(summary.totalPlanned)} icon={<TrendingUp size={20}/>} colorClass="bg-white border-l-4 border-blue-400" />
                   <StatCard title="Gastos Totais" value={formatCurrency(summary.totalExpenses)} icon={<Wallet size={20}/>} colorClass="bg-white border-l-4 border-rose-500" />
                   <StatCard title="Saldo em Caixa" value={formatCurrency(summary.netProfit)} icon={<Scale size={20}/>} />
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                   <h3 className="font-black text-slate-800 uppercase text-xs mb-6 tracking-widest">Contratos por Projeto</h3>
                   <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={projects}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                            <Tooltip cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} formatter={(val: number) => formatCurrency(val)} />
                            <Bar dataKey="budget" name="Valor Contratado" fill="#2563eb" radius={[6, 6, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
           )}

           {activeView === 'projects' && (
             <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Painel Operacional</h3>
                   <button onClick={() => setIsAddingProject(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg uppercase text-xs transition-all active:scale-95"><Plus size={18} /> Nova Obra</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                   {projects.length > 0 ? projects.map(p => {
                      const costs = p.expenses.reduce((acc, e) => acc + e.amount, 0);
                      const rev = p.revenues.reduce((acc, r) => acc + r.amount, 0);
                      const planned = p.plannedRevenue || 0;
                      return (
                        <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-200 transition-all">
                           <div className="p-8 flex-1">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h4 className="font-black text-lg text-slate-900 truncate mb-1">{p.name}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.client}</p>
                                 </div>
                                 <button onClick={() => {
                                    if(confirm('Deseja excluir esta obra permanentemente?')) {
                                       setProjects(prev => prev.filter(proj => proj.id !== p.id));
                                    }
                                 }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                              </div>
                              
                              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Contrato Global</span>
                                    <span className="text-xs font-black text-slate-900">{formatCurrency(p.budget)}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-blue-400 uppercase">Receita Prevista</span>
                                    <span className="text-xs font-black text-blue-600">{formatCurrency(planned)}</span>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-4">
                                 <div className="p-3 bg-rose-50 text-center rounded-xl border border-rose-100"><p className="text-[9px] font-black text-rose-400 uppercase">Saídas</p><p className="font-black text-rose-600 text-xs">{formatCurrency(costs)}</p></div>
                                 <div className="p-3 bg-emerald-50 text-center rounded-xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase">Realizado</p><p className="font-black text-emerald-600 text-xs">{formatCurrency(rev)}</p></div>
                              </div>
                           </div>
                           <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                              <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'expense' })} className="py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 transition-colors">Lançar Saída</button>
                              <button onClick={() => setGenericTransaction({ isOpen: true, projectId: p.id, type: 'revenue' })} className="py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-500 transition-colors">Lançar Entrada</button>
                           </div>
                        </div>
                      )
                   }) : (
                     <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <p className="text-slate-400 font-bold uppercase text-xs">Nenhuma obra cadastrada no sistema.</p>
                     </div>
                   )}
                </div>
             </div>
           )}

           {activeView === 'forecast' && (
              <div className="max-w-7xl mx-auto space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
                       <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors"><Calculator size={24} /></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Imposto (%)</p>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={settings.taxRate} 
                              onChange={(e) => setSettings({...settings, taxRate: Number(e.target.value)})}
                              className="text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none w-24 transition-all"
                            />
                            <Percent size={16} className="text-slate-300" />
                          </div>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-indigo-200 transition-all">
                       <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-100 transition-colors"><HandCoins size={24} /></div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comissão / Provisão (%)</p>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={settings.commissionRate} 
                              onChange={(e) => setSettings({...settings, commissionRate: Number(e.target.value)})}
                              className="text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none w-24 transition-all"
                            />
                            <Percent size={16} className="text-slate-300" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                       <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter">Projeção de Lucro Real</h3>
                          <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                            Baseado em {settings.taxRate}% Imposto e {settings.commissionRate}% Comissão sobre saldo a receber
                          </p>
                       </div>
                       <div className="p-3 bg-slate-800 rounded-2xl"><TrendingUp size={24} className="text-emerald-400" /></div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b">
                            <tr>
                               <th className="px-10 py-5">Identificação</th>
                               <th className="px-10 py-5 text-right">Contrato</th>
                               <th className="px-10 py-5 text-right">Saldo a Receber</th>
                               <th className="px-10 py-5 text-right">Impostos Previstos</th>
                               <th className="px-10 py-5 text-right">Comissões Previstas</th>
                               <th className="px-10 py-5 text-right">Lucro Final Projetado</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {projects.map(p => {
                               const expenses = p.expenses.reduce((acc, e) => acc + e.amount, 0);
                               const rev = p.revenues.reduce((acc, r) => acc + r.amount, 0);
                               const outstanding = Math.max(0, p.budget - rev);
                               
                               const provTax = outstanding * (settings.taxRate / 100);
                               const provCom = (outstanding - provTax) * (settings.commissionRate / 100);
                               const finalProfit = p.budget - expenses - provTax - provCom;
                               
                               return (
                                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                                     <td className="px-10 py-6 font-black text-slate-800">{p.name}</td>
                                     <td className="px-10 py-6 text-right font-bold text-slate-500">{formatCurrency(p.budget)}</td>
                                     <td className="px-10 py-6 text-right font-bold text-blue-600">{formatCurrency(outstanding)}</td>
                                     <td className="px-10 py-6 text-right font-bold text-rose-400">{formatCurrency(provTax)}</td>
                                     <td className="px-10 py-6 text-right font-bold text-indigo-400">{formatCurrency(provCom)}</td>
                                     <td className={`px-10 py-6 text-right font-black text-lg ${finalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                       {formatCurrency(finalProfit)}
                                     </td>
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
             <div className="max-w-4xl mx-auto text-center py-20 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="inline-flex p-8 bg-blue-600 text-white rounded-[3rem] shadow-2xl shadow-blue-500/30 mb-8"><BrainCircuit size={80} /></div>
                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Auditoria Inteligente</h3>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">Análise profunda de medições e centros de custo para otimização de margens de lucro.</p>
                <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                   {isAnalyzing ? (
                      <div className="space-y-6">
                         <div className="w-20 h-20 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                         <p className="font-black text-slate-800 uppercase text-xs animate-pulse tracking-widest">Processando Auditoria de Sistema...</p>
                      </div>
                   ) : aiAnalysis ? (
                      <div className="text-left whitespace-pre-wrap font-medium text-slate-700 prose prose-slate max-w-none">{aiAnalysis}</div>
                   ) : (
                      <div className="space-y-8">
                        <p className="text-slate-500">Nossa inteligência artificial analisará todos os lançamentos para identificar falhas de medição e desperdícios de materiais.</p>
                        <button onClick={async () => { setIsAnalyzing(true); setAiAnalysis(await analyzeFinancials(projects)); setIsAnalyzing(false); }} className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-slate-800 transition-all uppercase tracking-widest text-sm">Gerar Diagnóstico Estratégico</button>
                      </div>
                   )}
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Modais do Sistema */}
      {genericTransaction.isOpen && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className={`p-8 text-white flex justify-between items-center ${genericTransaction.type === 'expense' ? 'bg-slate-900' : 'bg-blue-600'}`}>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest">{genericTransaction.type === 'expense' ? 'Registro de Despesa' : 'Lançamento de Receita'}</h3>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Módulo Financeiro Central</p>
                  </div>
                  <button onClick={() => setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' })} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amount = Number(formData.get('amount'));
                  const description = formData.get('description') as string;
                  const date = formData.get('date') as string;
                  setProjects(prev => prev.map(p => {
                     if (p.id !== genericTransaction.projectId) return p;
                     if (genericTransaction.type === 'expense') {
                        return { ...p, expenses: [...p.expenses, { id: crypto.randomUUID(), description, amount, date, category: formData.get('category') as any }] };
                     } else {
                        return { ...p, revenues: [...p.revenues, { id: crypto.randomUUID(), description, amount, date }] };
                     }
                  }));
                  setGenericTransaction({ isOpen: false, projectId: null, type: 'expense' });
               }} className="p-10 space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                     <input required name="description" placeholder="Ex: NF Material de Alvenaria" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor R$</label>
                        <input required name="amount" type="number" step="0.01" placeholder="0,00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none focus:border-blue-500" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data</label>
                        <input required name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                     </div>
                  </div>
                  {genericTransaction.type === 'expense' && (
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Centro de Custo</label>
                        <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 appearance-none">
                           <option value="Material">Material</option>
                           <option value="Mão de Obra">Mão de Obra</option>
                           <option value="Comissão">Comissão / Provisão</option>
                           <option value="Equipamentos">Aluguel de Equipamentos</option>
                           <option value="Serviços Terceiros">Serviços Terceiros</option>
                           <option value="Outros">Outros Custos</option>
                        </select>
                     </div>
                  )}
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl hover:bg-blue-500 transition-all active:scale-[0.98] tracking-widest text-xs">Confirmar Registro</button>
               </form>
            </div>
         </div>
      )}

      {isAddingProject && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Abertura de Obra</h3>
                  <button onClick={() => setIsAddingProject(false)}><X size={24} /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  setProjects([...projects, { 
                     id: crypto.randomUUID(), 
                     name: formData.get('name') as string, 
                     client: formData.get('client') as string, 
                     budget: Number(formData.get('budget')), 
                     plannedRevenue: Number(formData.get('plannedRevenue') || 0),
                     startDate: new Date().toISOString(), 
                     status: 'Em Execução', 
                     expenses: [], 
                     revenues: [] 
                  }]);
                  setIsAddingProject(false);
               }} className="p-10 space-y-5 overflow-y-auto max-h-[80vh]">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Identificação da Obra</label>
                     <input required name="name" placeholder="Ex: Reforma Colégio Municipal" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Órgão / Cliente</label>
                     <input required name="client" placeholder="Ex: Secretaria de Obras" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor do Contrato R$</label>
                      <input required name="budget" type="number" step="0.01" placeholder="0,00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase ml-1">Receita Prevista R$</label>
                      <input name="plannedRevenue" type="number" step="0.01" placeholder="0,00" className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-xl font-black outline-none focus:border-blue-500" title="Quanto você planeja receber nesta obra (ex: medição atual)" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-xl hover:bg-blue-500 transition-all tracking-widest text-xs">Cadastrar no Sistema</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
