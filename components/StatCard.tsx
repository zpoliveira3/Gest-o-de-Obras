
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, colorClass = "bg-white" }) => {
  return (
    <div className={`${colorClass} p-8 rounded-[2rem] shadow-xl border border-slate-200/50 flex items-start justify-between transition-all hover:scale-[1.02] hover:shadow-2xl duration-300 relative overflow-hidden group`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">{title}</p>
        <h3 className="text-2xl font-black mt-1 tracking-tight">{value}</h3>
        {trend && (
          <p className={`text-[10px] mt-4 font-black uppercase tracking-widest flex items-center gap-1 ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}% <span className="text-slate-400 font-bold opacity-60">vs Mês Anterior</span>
          </p>
        )}
      </div>
      <div className="p-4 bg-slate-50/80 rounded-2xl text-slate-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-12">
        {icon}
      </div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-slate-100/50 rounded-full blur-2xl group-hover:bg-blue-100/20 transition-all duration-700"></div>
    </div>
  );
};
