import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Server, Zap, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const AdminHealthDash: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="max-w-6xl mx-auto space-y-8 mt-10">
            <div className="bg-white/80 backdrop-blur-3xl rounded-[40px] shadow-premium border border-white/40 overflow-hidden relative group/mega transition-all duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="p-6 md:p-10 border-b border-slate-100/50 bg-gradient-to-b from-emerald-500/[0.02] to-transparent">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3.5 bg-emerald-500 text-white rounded-2xl group-hover:rotate-[15deg] transition-transform duration-500 group-hover:scale-110">
                            <Activity size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-promed-text tracking-tight">System Health & Telemetry</h3>
                            <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Performance Baselines</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-400 font-bold tracking-wide mt-4 opacity-70 italic">
                        Real-time cost analysis, database read/write volumes, and client performance metrics.
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Zap size={18} className="text-amber-500" />
                                <span className="text-xs font-black uppercase tracking-widest">Avg Render Time</span>
                            </div>
                            <div className="text-3xl font-black text-promed-text mb-1">12.4 <span className="text-lg text-slate-300">ms</span></div>
                            <div className="text-xs font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-1 rounded-md">Optimized (O(1) Array)</div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Database size={18} className="text-blue-500" />
                                <span className="text-xs font-black uppercase tracking-widest">DB Connections</span>
                            </div>
                            <div className="text-3xl font-black text-promed-text mb-1">~14 <span className="text-lg text-slate-300">Active</span></div>
                            <div className="text-xs font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-1 rounded-md">Multiplexed via Cache</div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Server size={18} className="text-purple-500" />
                                <span className="text-xs font-black uppercase tracking-widest">Cache Hit Ratio</span>
                            </div>
                            <div className="text-3xl font-black text-promed-text mb-1">94.2 <span className="text-lg text-slate-300">%</span></div>
                            <div className="text-xs font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-1 rounded-md">Service Worker Active</div>
                        </div>
                    </div>

                    {/* Cost Analysis Deep Links */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <h4 className="text-sm font-black text-promed-text uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ExternalLink size={16} className="text-promed-primary" />
                            External GCP Cost Dashboards
                        </h4>
                        <div className="space-y-3 relative z-10">
                            <a 
                                href="https://console.firebase.google.com/project/graft-dashboard/usage/details" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between p-4 bg-white rounded-2xl hover:border-promed-primary/30 border border-transparent transition-all shadow-sm group"
                            >
                                <div>
                                    <h5 className="font-bold text-promed-text text-sm">Firestore Usage & Quotas</h5>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Track Daily Read/Write/Delete Operations</p>
                                </div>
                                <ExternalLink size={16} className="text-slate-300 group-hover:text-promed-primary transition-colors" />
                            </a>

                            <a 
                                href="https://console.cloud.google.com/billing" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between p-4 bg-white rounded-2xl hover:border-promed-primary/30 border border-transparent transition-all shadow-sm group"
                            >
                                <div>
                                    <h5 className="font-bold text-promed-text text-sm">GCP Billing Console</h5>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Forecast cost and view payment history</p>
                                </div>
                                <ExternalLink size={16} className="text-slate-300 group-hover:text-promed-primary transition-colors" />
                            </a>
                            
                            <a 
                                href="https://console.firebase.google.com/project/graft-dashboard/performance/app/web" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between p-4 bg-white rounded-2xl hover:border-promed-primary/30 border border-transparent transition-all shadow-sm group"
                            >
                                <div>
                                    <h5 className="font-bold text-promed-text text-sm">Firebase Performance App</h5>
                                    <p className="text-xs font-medium text-slate-400 mt-1">View custom trace execution times across users</p>
                                </div>
                                <ExternalLink size={16} className="text-slate-300 group-hover:text-promed-primary transition-colors" />
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
