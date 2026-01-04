import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Syringe,
  ArrowRight,

  Check,
  MapPin
} from 'lucide-react';
import dateIcon from '../../assets/images/date.png';
import operationIcon from '../../assets/images/operation_icon.png';
import patientsIcon from '../../assets/images/patients.png';
import phoneIcon from '../../assets/images/phone.png';
import { motion } from 'framer-motion';
import { Injection, InjectionStatus, Patient } from '../../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

// --- Vitals Card (Compact) ---
interface VitalsCardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  isLoading?: boolean;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({ label, value, icon: Icon, color, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center space-x-4 border border-slate-100 animate-pulse">
        <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          <div className="h-5 bg-slate-100 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  // Map solid colors to gradients or custom solid backgrounds
  const getBackgroundClass = (baseColor: string) => {
    if (baseColor.includes('rose')) return 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30 border border-rose-400/20';
    if (baseColor.includes('blue') || baseColor.includes('primary')) return 'bg-promed-primary shadow-glow border border-white/10';
    if (baseColor.includes('emerald') || baseColor.includes('success')) return 'bg-[hsl(160,84%,39%)] shadow-lg shadow-emerald-500/30 border border-emerald-400/20';
    if (baseColor.includes('teal')) return 'shadow-lg shadow-[hsl(176,79%,27%)]/40 border border-[hsl(176,79%,27%)]/20'; // No bg class, handled by style
    if (baseColor.includes('purple')) return 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30 border border-purple-400/20';
    return 'bg-white border border-promed-primary/10'; // Fallback
  };

  const backgroundClass = getBackgroundClass(color);
  // Force solid teal usage if 'teal' is in the color prop (passed from Dashboard)
  const isTeal = color.includes('teal');
  const customStyle = isTeal ? { backgroundColor: 'hsl(176, 79%, 27%)' } : {};
  // const brandColor = '#1E40AF';

  const isColored = backgroundClass.includes('gradient') || isTeal;

  return (
    <div
      className={`rounded - 2xl p - 5 flex items - center space - x - 4 transition - all duration - 300 hover: scale - [1.02] active: scale - [0.98] ${backgroundClass} ${isColored ? 'text-white' : 'shadow-sm text-slate-900'} `}
      style={customStyle}
    >
      <div className={`p - 3.5 rounded - 2xl backdrop - blur - md transition - colors ${isColored ? 'bg-white/20 text-white shadow-inner border border-white/10' : `${color} bg-opacity-10 text-slate-600`} `}>
        <Icon size={26} strokeWidth={2.5} />
      </div>
      <div>
        <p className={`text - [11px] font - bold uppercase tracking - widest mb - 1 opacity - 90 ${isColored ? 'text-white' : 'text-slate-500'} `}>{label}</p>
        <p className={`text - 3xl font - extrabold tracking - tight ${isColored ? 'text-white drop-shadow-sm' : 'text-slate-900'} `}>{value}</p>
      </div>
    </div>
  );
};

// --- Injection Appointment Widget (Right Side) ---
interface InjectionAppointmentProps {
  patients: Patient[];
  onViewPatient: (id: string) => void;
}

export const InjectionAppointmentWidget: React.FC<InjectionAppointmentProps> = ({ patients, onViewPatient }) => {
  const { language, t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'Operation' | 'Injection'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Helper to format date label
  const getDateLabel = (dateObj: Date) => {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return t('today') || 'Today';
    if (d.getTime() === tomorrow.getTime()) return t('tomorrow') || 'Tomorrow';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year} `;
  };

  // Helper to check if date is today (for styling)
  const isToday = (dateObj: Date) => {
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  // 3. Merge and Sort
  const upcomingEvents = useMemo(() => {
    const upcomingInjections = patients
      .flatMap(p => (p.injections || []).map(inj => ({
        uniqueId: `inj-${p.id}-${inj.id}`,
        patientId: p.id,
        name: p.fullName,
        img: p.profileImage,
        type: 'Injection',
        title: 'Plasma Injection',
        detail: inj.notes || inj.dose || 'Plasma Injection',
        dateObj: new Date(inj.date),
        status: inj.status
      })))
      .filter(item => item.status === InjectionStatus.SCHEDULED && item.dateObj >= today);

    const upcomingOperations = patients
      .filter(p => p.operationDate && new Date(p.operationDate) >= today)
      .map(p => ({
        uniqueId: `op-${p.id}`,
        patientId: p.id,
        name: p.fullName,
        img: p.profileImage,
        type: 'Operation',
        title: 'Transplant',
        detail: p.technique === 'Hair' ? t('transplant_hair') :
          p.technique === 'Eyebrow' ? t('transplant_eyebrow') :
            p.technique === 'Beard' ? t('transplant_beard') : (p.technique || 'N/A'),
        dateObj: new Date(p.operationDate),
        status: 'Scheduled'
      }));

    return [...upcomingInjections, ...upcomingOperations]
      .filter(event => filter === 'all' || event.type === filter)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [patients, filter, today, t]);

  return (
    <div className="bg-white rounded-[32px] shadow-soft border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-promed-primary/5 flex flex-col sm:flex-row justify-between items-center bg-promed-bg/50 gap-4">
        <h3 className="text-lg font-bold text-promed-text tracking-tight flex items-center gap-2">
          <div className="p-2 bg-promed-primary/10 rounded-xl border border-promed-primary/10 shadow-inner">
            <img src={dateIcon} alt="Date" className="w-5 h-5 object-contain" />
          </div>
          {t('upcoming_patients')}
        </h3>

        <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-promed-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
          >
            {t('filter_all')}
          </button>
          <button
            onClick={() => setFilter('Operation')}
            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'Operation' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
          >
            {t('filter_operations')}
          </button>
          <button
            onClick={() => setFilter('Injection')}
            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'Injection' ? 'bg-white text-promed-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
          >
            {t('filter_injections')}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {upcomingEvents.map((event) => (
          <div
            key={event.uniqueId}
            className="h-[72px] bg-white rounded-2xl border border-promed-primary/5 px-4 shadow-soft hover:shadow-card transition-all flex items-center justify-between group cursor-pointer hover:border-promed-primary/20 active:scale-[0.99]"
            onClick={() => onViewPatient(event.patientId)}
          >
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={event.img || "https://via.placeholder.com/48"}
                  alt={event.name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-100 group-hover:scale-105 transition-transform duration-300"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-white shadow-sm ${event.type === 'Operation' ? 'bg-rose-500' : 'bg-promed-primary'}`}>
                  {event.type === 'Operation' ? <img src={operationIcon} className="w-2.5 h-2.5 brightness-0 invert" /> : <img src={patientsIcon} className="w-2.5 h-2.5 brightness-0 invert" />}
                </div>
              </div>

              {/* Info */}
              <div>
                <h4 className="font-bold text-promed-text text-[14px] leading-tight group-hover:text-promed-primary transition">{event.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border ${event.type === 'Operation' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-promed-bg text-promed-primary border-promed-primary/10'} `}>
                    {event.type === 'Operation' ? t('operation') : t('injection')}
                  </span>
                  <span className="text-[11px] text-promed-muted font-medium truncate max-w-[120px]">{event.detail}</span>
                </div>
              </div>
            </div>

            {/* Meta (Right Side) */}
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isToday(event.dateObj)
                ? 'bg-promed-primary text-white shadow-soft shadow-promed-primary/30'
                : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                } `}>
                {getDateLabel(event.dateObj)}
              </span>
            </div>
          </div>
        ))}

        {upcomingEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 pb-28">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-promed-primary/5 blur-3xl rounded-full scale-150 animate-pulse"></div>
              <img
                src={patientsIcon}
                alt="Relaxing"
                className="w-48 h-48 object-contain relative z-10 drop-shadow-2xl opacity-100"
              />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest opacity-50">{t('empty_state_peace')}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Surgery Floor Widget ---
interface SurgeryFloorProps {
  patients: Patient[];
}

export const SurgeryFloorWidget: React.FC<SurgeryFloorProps> = ({ patients }) => {
  const { t } = useLanguage();

  // Filter real patients for "Today's Operations"
  // User requested to keep this empty for now
  const operations: any[] = [];
  /*
  const operations = patients
    .filter(p => p.operationDate && new Date(p.operationDate).toDateString() === new Date().toDateString())
    .map(p => ({
      id: p.id,
      name: p.fullName,
      img: p.profileImage,
      technique: p.technique || 'N/A',
      grafts: p.grafts ? p.grafts.toLocaleString() : 'N/A',
      status: p.status === 'Active' ? 'Extraction' : p.status, // Simple mapping for now
      progress: p.status === 'Active' ? 45 : 100
    }));
  */

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Extraction': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Implantation': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Lunch': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Anesthesia': return 'text-purple-600 bg-purple-50 border-purple-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <img src={operationIcon} className="w-5 h-5 object-contain" />
          {t('todays_operations')}
        </h3>
        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">
          {operations.length} {t('live_now')}
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        {operations.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('name')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('technique')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">{t('grafts')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {operations.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={op.img} alt={op.name} className="w-9 h-9 rounded-lg object-cover ring-2 ring-white shadow-sm" />
                      <span className="font-bold text-slate-700 text-sm whitespace-nowrap">{op.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border bg-slate-50 text-slate-700 border-slate-100">
                      {op.technique === 'Hair' ? t('transplant_hair') :
                        op.technique === 'Eyebrow' ? t('transplant_eyebrow') :
                          op.technique === 'Beard' ? t('transplant_beard') : (op.technique || 'N/A')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-900 font-bold text-sm tracking-tight">{op.grafts}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(op.status)} `}>
                          {op.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{op.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${op.status === 'Extraction' ? 'bg-amber-400' : 'bg-emerald-500'
                            } `}
                          style={{ width: `${op.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
            <img src={operationIcon} className="w-12 h-12 opacity-10 mb-4 grayscale" />
            <p className="text-sm font-bold uppercase tracking-widest">{t('no_operations') || 'No operations for today'}</p>
          </div>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/30">
        <button className="w-full py-2.5 text-sm font-bold text-slate-500 hover:text-promed.primary transition-colors flex items-center justify-center gap-2">
          {t('view_floor_map')} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

// --- Injection Radar Widget ---
interface InjectionRadarProps {
  patients: Patient[];
  onCheck: (id: string) => void;
}

export const InjectionRadarWidget: React.FC<InjectionRadarProps> = ({ patients, onCheck }) => {
  const { t } = useLanguage();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Filter real injections for "Radar"
  const dueInjections = patients
    .flatMap(p => (p.injections || []).map(i => ({
      ...i,
      patientId: p.id,
      patientName: p.fullName,
      patientColor: p.fullName.charCodeAt(0) % 2 === 0 ? 'text-promed-primary bg-promed-light' : 'text-rose-600 bg-rose-50'
    })))
    .filter(i => {
      const injDate = new Date(i.date);
      injDate.setHours(0, 0, 0, 0);
      return i.status === InjectionStatus.SCHEDULED && (injDate.getTime() === today.getTime() || injDate.getTime() === tomorrow.getTime());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Syringe size={20} className="text-promed-primary" />
          {t('plasma_followups')}
        </h3>
        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{t('due_within_24h')}</p>
      </div>

      {dueInjections.length > 0 ? dueInjections.map((item) => (
        <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/80 transition-all">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${item.patientColor} shadow-sm border border-black/5`}>
              {item.notes?.toLowerCase().includes('wash') ? '🌊' : item.notes?.toLowerCase().includes('prp') ? '💉' : '📋'}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm group-hover:text-promed.primary transition whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{item.patientName}</h4>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.notes || t('routine_followup')}</p>
            </div>
          </div>
          <div className="flex space-x-1 ml-2">
            <button className="p-2 text-slate-400 hover:text-promed-primary hover:bg-promed-light rounded-lg transition-colors border border-transparent hover:border-promed-primary/10 flex items-center justify-center">
              <img src={phoneIcon} className="w-3.5 h-3.5 object-contain opacity-60 hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => onCheck(item.patientId)}
              className="p-2 text-promed-muted hover:text-promed-primary hover:bg-promed-bg rounded-lg transition-colors border border-transparent hover:border-promed-primary/10"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      )) : (
        <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 grayscale">
          <p className="text-[10px] font-black uppercase tracking-widest">{t('empty_state_peace')}</p>
        </div>
      )}

      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <button className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-colors uppercase tracking-widest">
          {t('view_master_schedule')}
        </button>
      </div>
    </div>
  );
};

// --- Stat Card ---
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: any;
  iconImg?: string;
  mascotImg?: string;
  colorClass: string;
  shadowColor: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon: Icon,
  iconImg,
  mascotImg,
  colorClass,
  shadowColor,
  isLoading
}) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="p-6 rounded-[32px] relative overflow-hidden h-[180px] bg-slate-200 animate-pulse">
        <div className="flex space-x-3 mb-5">
          <div className="w-10 h-10 bg-slate-300 rounded-lg"></div>
          <div className="h-4 bg-slate-300 rounded w-24 self-center"></div>
        </div>
        <div className="h-10 bg-slate-300 rounded w-16 mb-2"></div>
        <div className="h-3 bg-slate-300 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-7 rounded-[32px] text-white relative overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${colorClass} shadow-xl group`}
      style={{ boxShadow: `0 20px 40px -12px ${shadowColor}` }}
    >
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
              {iconImg ? (
                <img src={iconImg} alt={label} className="w-5 h-5 object-contain brightness-0 invert" />
              ) : (
                <Icon size={20} className="text-white" />
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">{label}</span>
          </div>
          <div>
            <span className="text-5xl font-black tracking-tight text-white block">{value}</span>
            {change && (
              <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/10">
                <span className="text-[10px] font-black">{change}</span>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Mascot Image */}
      {mascotImg && (
        <img
          src={mascotImg}
          alt="Mascot"
          className="absolute -bottom-4 -right-4 w-40 h-40 object-contain drop-shadow-2xl z-0 pointer-events-none transition-all duration-500 ease-out translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-110 group-hover:-rotate-3"
        />
      )}

      {/* Decorative Orbs */}
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-black/10 rounded-full blur-3xl pointer-events-none z-0" />
    </div>
  );
};

// --- Chart Widget ---
const chartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 200 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 700 },
];

export const StatsChart: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-7 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-bold text-promed-text tracking-tight">{t('patients_stats')}</h3>
          <p className="text-sm text-promed-muted font-medium mt-0.5">{t('registration_overview')}</p>
        </div>
        <select className="text-sm bg-promed-bg border-promed-primary/10 border rounded-xl px-3 py-2 text-promed-text focus:outline-none focus:ring-2 focus:ring-promed-primary/20 transition cursor-pointer font-bold">
          <option>{t('monthly')}</option>
          <option>{t('weekly')}</option>
        </select>
      </div>
      <div className="w-full h-[300px]" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(206, 100%, 34%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(206, 100%, 34%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }}
              dy={15}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px',
                fontWeight: 'bold',
                color: '#1E293B',
                backgroundColor: '#ffffff'
              }}
              cursor={{ stroke: 'hsl(206, 100%, 34%)', strokeWidth: 1, strokeDasharray: '4 4' }}
              itemStyle={{ color: 'hsl(206, 100%, 34%)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(206, 100%, 34%)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(206, 100%, 34%)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Upcoming Injections List ---
interface UpcomingProps {
  patients: Patient[];
  onViewPatient: (id: string) => void;
}

export const UpcomingInjections: React.FC<UpcomingProps> = ({ patients, onViewPatient }) => {
  const { language, t } = useLanguage();
  const localeString = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
  // Flatten all injections, filter for scheduled, and sort
  const today = new Date().toISOString().split('T')[0];

  const upcoming = (patients || [])
    .flatMap(p => (p.injections || []).map(i => ({ ...i, patientName: p.fullName || 'Unknown', patientImg: p.profileImage, patientId: p.id })))
    .filter(i => i.status === InjectionStatus.SCHEDULED && i.date >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="bg-white p-7 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-slate-200 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-promed-text tracking-tight">{t('todays_appointments')}</h3>
          <p className="text-sm text-promed-muted font-medium mt-0.5">{t('upcoming_schedule')}</p>
        </div>
        <button className="text-sm text-promed-primary font-bold hover:bg-promed-bg px-3 py-1.5 rounded-lg transition">{t('see_all')}</button>
      </div>

      <div className="space-y-3 flex-1">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <Calendar size={32} className="opacity-20" />
            <p className="font-medium">{t('no_upcoming')}</p>
          </div>
        ) : (
          upcoming.map((inj) => (
            <div
              key={inj.id + inj.patientId}
              className="flex items-center justify-between group cursor-pointer p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
              onClick={() => onViewPatient(inj.patientId)}
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={inj.patientImg || "https://via.placeholder.com/40"}
                    alt={inj.patientName}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-slate-100"
                  />

                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-promed.primary transition">{inj.patientName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1 font-medium">
                    <Clock size={12} className="text-slate-400" />
                    <span>{t('plasma_injection')}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${inj.date === today ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  } `}>
                  {inj.date === today ? t('today') : new Date(inj.date).toLocaleDateString(localeString, { month: 'short', day: 'numeric' })}
                </span>
                {inj.date === today && <span className="text-xs font-bold text-slate-700">10:00 AM</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
