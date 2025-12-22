import React from 'react';
import {
  Users,
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
  Phone,
  Check,
  MapPin
} from 'lucide-react';
import { Injection, InjectionStatus, Patient } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

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
    if (baseColor.includes('blue')) return 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30 border border-blue-400/20';
    if (baseColor.includes('emerald')) return 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 border border-emerald-400/20';
    if (baseColor.includes('teal')) return 'shadow-lg shadow-[hsl(176,79%,27%)]/40 border border-[hsl(176,79%,27%)]/20'; // No bg class, handled by style
    if (baseColor.includes('purple')) return 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30 border border-purple-400/20';
    return 'bg-white border border-slate-100'; // Fallback
  };

  const backgroundClass = getBackgroundClass(color);
  // Force solid teal usage if 'teal' is in the color prop (passed from Dashboard)
  const isTeal = color.includes('teal');
  const customStyle = isTeal ? { backgroundColor: 'hsl(176, 79%, 27%)' } : {};

  const isColored = backgroundClass.includes('gradient') || isTeal;

  return (
    <div
      className={`rounded-2xl p-5 flex items-center space-x-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${backgroundClass} ${isColored ? 'text-white' : 'shadow-sm text-slate-900'}`}
      style={customStyle}
    >
      <div className={`p-3.5 rounded-2xl backdrop-blur-md transition-colors ${isColored ? 'bg-white/20 text-white shadow-inner border border-white/10' : `${color} bg-opacity-10 text-slate-600`}`}>
        <Icon size={26} strokeWidth={2.5} />
      </div>
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 opacity-90 ${isColored ? 'text-white' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-3xl font-extrabold tracking-tight ${isColored ? 'text-white drop-shadow-sm' : 'text-slate-900'}`}>{value}</p>
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
  const { t } = useLanguage();

  const today = new Date();
  const todayString = today.toDateString();

  // Filter for today's injections from real patient data
  const appointments = patients
    .flatMap(p => (p.injections || []).map(inj => ({
      patientId: p.id,
      name: p.fullName,
      img: p.profileImage,
      ...inj,
      dateObj: new Date(inj.date)
    })))
    .filter(appt => appt.dateObj.toDateString() === todayString)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const getStatusStyle = (status: string) => {
    switch (status) {
      case InjectionStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700';
      case InjectionStatus.SCHEDULED: return 'bg-blue-100 text-blue-700';
      case InjectionStatus.CANCELLED: return 'bg-red-100 text-red-700';
      case InjectionStatus.MISSED: return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Syringe size={20} className="text-teal-600" />
          {t('injection_schedule') || 'Plasma Injections'}
        </h3>
        <button className="text-sm font-bold hover:opacity-80 transition" style={{ color: 'hsl(176, 79%, 27%)' }}>
          {t('see_all')}
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {appointments.map((appt) => (
          <div key={appt.id + appt.patientId} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group cursor-pointer" onClick={() => onViewPatient(appt.patientId)}>
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={appt.img || "https://via.placeholder.com/40"}
                  alt={appt.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-100"
                />
              </div>

              {/* Info */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-promed-primary transition">{appt.name}</h4>
                <p className="text-xs text-slate-400 mt-1 font-medium">{appt.notes || 'Plasma Injection'}</p>
                <div className="flex items-center space-x-1 mt-1 xl:hidden">
                  <MapPin size={10} className="text-slate-300" />
                  <span className="text-[10px] text-slate-400">Clinic</span>
                </div>
              </div>
            </div>

            {/* Meta (Right Side) */}
            <div className="flex flex-col items-end space-y-2">
              <span className="text-xs font-bold text-slate-500">
                {appt.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${getStatusStyle(appt.status)}`}>
                {appt.status}
                {appt.status === InjectionStatus.COMPLETED && <CheckCircle size={10} />}
                {appt.status === InjectionStatus.SCHEDULED && <Clock size={10} />}
                {appt.status === InjectionStatus.CANCELLED && <XCircle size={10} />}
                {appt.status === InjectionStatus.MISSED && <AlertCircle size={10} />}
              </span>
            </div>
          </div>
        ))}

        {appointments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Calendar size={32} className="opacity-20 mb-2" />
            <p>{t('no_upcoming') || 'No injections today'}</p>
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
          <Activity size={20} className="text-rose-500" />
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
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${op.technique === 'DHI' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                      }`}>
                      {op.technique}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-900 font-bold text-sm tracking-tight">{op.grafts}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(op.status)}`}>
                          {op.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{op.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${op.status === 'Extraction' ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
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
            <Activity size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">{t('no_operations') || 'No operations for today'}</p>
          </div>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/30">
        <button className="w-full py-2.5 text-sm font-bold text-slate-500 hover:text-promed-primary transition-colors flex items-center justify-center gap-2">
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
      patientColor: p.fullName.charCodeAt(0) % 2 === 0 ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'
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
          <Syringe size={20} className="text-blue-500" />
          Plasma & Follow-ups
        </h3>
        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">DUE WITHIN 24H</p>
      </div>

      <div className="divide-y divide-slate-50 flex-1 overflow-y-auto no-scrollbar">
        {dueInjections.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/80 transition-all">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${item.patientColor} shadow-sm border border-black/5`}>
                {item.notes?.toLowerCase().includes('wash') ? '🌊' : item.notes?.toLowerCase().includes('prp') ? '💉' : '📋'}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{item.patientName}</h4>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.notes || 'Routine Follow-up'}</p>
              </div>
            </div>
            <div className="flex space-x-1 ml-2">
              <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                <Phone size={14} />
              </button>
              <button
                onClick={() => onCheck(item.patientId)}
                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <button className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-colors uppercase tracking-widest">
          View Master Schedule
        </button>
      </div>
    </div>
  );
};

// --- Stat Card ---
interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: any;
  colorClass: string;
  shadowColor: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon: Icon, colorClass, shadowColor, isLoading }) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className={`p-7 rounded-2xl relative overflow-hidden h-[160px] bg-slate-200 animate-pulse`}>
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
      className={`p-7 rounded-2xl text-white relative overflow-hidden transition-transform hover:-translate-y-1 duration-300 ${colorClass}`}
      style={{ boxShadow: `0 10px 30px -5px ${shadowColor}` }}
    >
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-5 opacity-90">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
            <Icon size={22} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide uppercase opacity-90">{label}</span>
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-4xl font-bold tracking-tight text-white">{value}</span>
          <div className="flex items-center space-x-1 bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
            <span className="text-xs font-bold text-white">{change}</span>
          </div>
        </div>
        <p className="text-xs opacity-80 mt-2 pl-1 font-semibold">{t('last_month')}</p>
      </div>
      {/* Decorative elements */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute right-12 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
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
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{t('patients_stats')}</h3>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Overview of patient registration</p>
        </div>
        <select className="text-sm bg-slate-50 border-slate-200 border rounded-xl px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 transition cursor-pointer font-bold">
          <option>{t('monthly')}</option>
          <option>{t('weekly')}</option>
        </select>
      </div>
      <div className="w-full h-[300px]" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D7A72" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0D7A72" stopOpacity={0} />
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
              cursor={{ stroke: '#0D7A72', strokeWidth: 1, strokeDasharray: '4 4' }}
              itemStyle={{ color: '#0D7A72' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0D7A72"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#0D7A72' }}
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
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{t('todays_appointments')}</h3>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Upcoming schedule</p>
        </div>
        <button className="text-sm text-promed-primary font-bold hover:bg-promed-primary/10 px-3 py-1.5 rounded-lg transition">{t('see_all')}</button>
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
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <div className="bg-emerald-500 w-2.5 h-2.5 rounded-full border-2 border-white"></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition">{inj.patientName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1 font-medium">
                    <Clock size={12} className="text-slate-400" />
                    <span>{t('plasma_injection')}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${inj.date === today ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
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
