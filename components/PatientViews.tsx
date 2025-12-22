
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Upload,
  Camera,
  Syringe,
  Activity,
  Save,
  Clock,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  FileText,
  User,
  Hash,
  Zap,
  Search,
  ArrowRight,
  Eye,
  Pencil,
  Image as ImageIcon
} from 'lucide-react';
import { Patient, InjectionStatus, Injection } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { DatePicker } from './ui/DatePicker';
import { Portal } from './Portal';
import { ImageWithFallback } from './ui/ImageWithFallback';
import { compressImage } from '../lib/imageOptimizer';
import { CustomSelect } from './CustomSelect';

// Helper to translate status
const useStatusTranslation = () => {
  const { t } = useLanguage();
  return (status: string) => {
    switch (status) {
      case 'Active': return t('status_active');
      case 'Recovered': return t('status_recovered');
      case 'Observation': return t('status_observation');
      case InjectionStatus.SCHEDULED: return t('status_scheduled');
      case InjectionStatus.COMPLETED: return t('status_completed');
      case InjectionStatus.MISSED: return t('status_missed');
      case InjectionStatus.CANCELLED: return t('status_cancelled');
      default: return status;
    }
  }
}

// ... (inside the file)

// --- Modals ---
const InjectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, notes: string) => void;
  initialData?: { date: string; notes?: string };
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setDate(initialData?.date || new Date().toISOString().split('T')[0]);
      setNotes(initialData?.notes || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-modal transform scale-100 transition-all border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{initialData ? t('edit_injection') : t('add_injection')}</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition p-2 hover:bg-slate-100 rounded-lg"><X size={24} /></button>
          </div>

          <div className="space-y-5">
            <div>
              <DatePicker
                label={t('date')}
                value={date}
                onChange={setDate}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-promed-primary focus:border-promed-primary focus:outline-none h-32 resize-none transition-all text-slate-900 placeholder-slate-400"
                placeholder={t('enter_notes')}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200">{t('cancel')}</button>
              <button
                onClick={() => { onSave(date, notes); onClose(); }}
                className="px-6 py-2.5 bg-promed-primary text-white font-bold rounded-xl hover:bg-teal-800 transition active:scale-95 shadow-lg shadow-teal-700/20"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

const PhotoLabelModal: React.FC<{
  isOpen: boolean;
  image: string | null;
  onClose: () => void;
  onSave: (label: string) => void;
}> = ({ isOpen, image, onClose, onSave }) => {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('Months');

  if (!isOpen || !image) return null;

  const handleSave = () => {
    if (!value) return;
    const translatedUnit = unit === 'Months' ? t('months') : unit === 'Days' ? t('days') : t('weeks');
    onSave(`${value} ${translatedUnit}`);
    setValue('');
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-modal border border-slate-200">
          <h3 className="text-xl font-bold mb-4 text-slate-800">{t('photo_label_title')}</h3>
          <div className="flex justify-center mb-6 bg-slate-50 rounded-xl p-2 border border-slate-200">
            <div className="h-48 w-full max-w-[300px] mx-auto">
              <ImageWithFallback src={image} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-sm" fallbackType="image" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-700">{t('time_since_op')}</p>
            <div className="flex space-x-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1.5">{t('value')}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-promed-primary focus:border-promed-primary outline-none transition-all text-slate-900 font-medium"
                  placeholder="3"
                  autoFocus
                />
              </div>
              <div className="w-1/3">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1.5">{t('unit')}</label>
                <CustomSelect
                  value={unit}
                  onChange={setUnit}
                  options={[
                    { value: 'Days', label: t('days') },
                    { value: 'Weeks', label: t('weeks') },
                    { value: 'Months', label: t('months') },
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-6">
              <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200">{t('cancel')}</button>
              <button
                onClick={handleSave}
                disabled={!value}
                className="px-6 py-2.5 bg-promed-primary text-white font-bold rounded-xl hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// --- Patient List ---
export const PatientList: React.FC<{
  patients: Patient[];
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onAddPatient: () => void;
  isLoading?: boolean;
}> = ({ patients, onSelect, searchQuery, onSearch, onAddPatient, isLoading }) => {
  const { language, t } = useLanguage();
  const localeString = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
  const translateStatus = useStatusTranslation();

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{t('patient_directory')}</h2>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">{patients.length}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64 group">
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-promed-primary focus:border-promed-primary focus:outline-none transition-all shadow-sm"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400 group-hover:text-promed-primary transition" size={18} />
          </div>
          <button
            onClick={onAddPatient}
            className="flex items-center justify-center space-x-2 bg-promed-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-800 transition shadow-lg shadow-teal-900/10 active:scale-95 whitespace-nowrap"
          >
            <PlusCircle size={18} />
            <span>{t('new_patient')}</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-5 pl-8">{t('name')}</th>
              <th className="p-5">{t('operation_date')}</th>
              <th className="p-5">{t('next_injection')}</th>
              <th className="p-5">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((patient, idx) => {
              const nextInj = patient.injections.find(i => i.status === InjectionStatus.SCHEDULED && new Date(i.date) >= new Date());
              return (
                <tr
                  key={patient.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => onSelect(patient.id)}
                >
                  <td className="p-5 pl-8">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-11 h-11">
                        <ImageWithFallback
                          src={patient.profileImage}
                          alt={patient.fullName}
                          className="w-full h-full rounded-xl shadow-sm ring-1 ring-slate-100"
                          fallbackType="user"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${patient.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition-colors">{patient.fullName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">{patient.gender === 'Male' ? t('gender_male') : patient.gender === 'Female' ? t('gender_female') : t('gender_other')}, {patient.age}y</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-sm font-medium text-slate-700">
                    {new Date(patient.operationDate).toLocaleDateString(localeString)}
                  </td>
                  <td className="p-5">
                    {nextInj ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                          {new Date(nextInj.date).toLocaleDateString(localeString)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-medium">{t('none_scheduled')}</span>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center space-x-1.5 border ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      patient.status === 'Recovered' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${patient.status === 'Active' ? 'bg-emerald-600' :
                        patient.status === 'Recovered' ? 'bg-slate-600' : 'bg-amber-600'
                        }`}></span>
                      <span>{translateStatus(patient.status)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
            {patients.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <User size={48} className="text-slate-200" />
                    <p className="font-medium">No patients found matching your search.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Patient Detail ---
export const PatientDetail: React.FC<{
  patient: Patient;
  onBack: () => void;
  onUpdateInjection: (pId: string, iId: string, status: InjectionStatus, notes?: string) => void;
  onAddInjection: (pId: string, date: string, notes: string) => void;
  onEditInjection: (pId: string, iId: string, date: string, notes: string) => void;
  onDeleteInjection: (pId: string, iId: string) => void;
  onAddAfterPhoto: (pId: string, photoOrFile: string | File, label: string) => void;
  onEditPatient: () => void;
  onDeletePatient: () => void;
}> = ({ patient, onBack, onUpdateInjection, onAddInjection, onEditInjection, onDeleteInjection, onAddAfterPhoto, onEditPatient, onDeletePatient }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInjModalOpen, setInjModalOpen] = useState(false);
  const [editingInj, setEditingInj] = useState<Injection | null>(null);

  const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);

  const { language, t } = useLanguage();
  const localeString = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
  const translateStatus = useStatusTranslation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image before preview
      const compressedFile = await compressImage(file);
      console.log('After photo compressed:',
        `${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      setTempFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhoto(reader.result as string);
        setPhotoModalOpen(true);
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  const handleSavePhoto = (label: string) => {
    if (tempPhoto) {
      onAddAfterPhoto(patient.id, tempFile || tempPhoto, label);
    }
  };

  const handleSaveInjection = (date: string, notes: string) => {
    if (editingInj) {
      onEditInjection(patient.id, editingInj.id, date, notes);
    } else {
      onAddInjection(patient.id, date, notes);
    }
    setEditingInj(null);
  };

  const openAddInjection = () => {
    setEditingInj(null);
    setInjModalOpen(true);
  };

  const openEditInjection = (inj: Injection) => {
    setEditingInj(inj);
    setInjModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, inj: Injection) => {
    e.stopPropagation();
    openEditInjection(inj);
  };

  const handleDeleteClick = (e: React.MouseEvent, injId: string) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete'))) {
      onDeleteInjection(patient.id, injId);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 hover:text-promed-primary transition mb-2 font-bold hover:-translate-x-1 duration-200 px-1">
        <ChevronLeft size={20} />
        <span>{t('back_to_list')}</span>
      </button>

      {/* Header Info */}
      <div className="bg-white rounded-3xl p-8 shadow-card border border-slate-200 flex flex-col md:flex-row gap-8 relative overflow-hidden">
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-promed-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex-shrink-0 relative w-40 h-40">
          <ImageWithFallback src={patient.profileImage} className="w-full h-full rounded-2xl object-cover shadow-lg ring-4 ring-white border border-slate-100" alt="Profile" fallbackType="user" />
          <div className="absolute -bottom-3 -right-3 bg-white p-1.5 rounded-xl shadow-md border border-slate-100">
            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${patient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
              {translateStatus(patient.status)}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{patient.fullName}</h2>
              <div className="flex flex-wrap items-center gap-6 text-slate-600 mt-3">
                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Activity size={16} className="text-promed-primary" />
                  <span className="font-semibold text-sm">{t('operation_date')}: {new Date(patient.operationDate).toLocaleDateString(localeString)}</span>
                </span>
                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Phone size={16} className="text-promed-primary" />
                  <span className="font-semibold text-sm">{patient.phone}</span>
                </span>
                {patient.email && (
                  <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Mail size={16} className="text-promed-primary" />
                    <span className="font-semibold text-sm">{patient.email}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Edit & Delete Buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={onEditPatient}
                className="flex items-center space-x-2 bg-white text-slate-700 border border-slate-200 hover:border-promed-primary hover:text-promed-primary hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm active:scale-95 whitespace-nowrap"
              >
                <Pencil size={16} />
                <span>{t('edit_patient')}</span>
              </button>
              <button
                onClick={onDeletePatient}
                className="flex items-center space-x-2 bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm active:scale-95 whitespace-nowrap"
              >
                <Trash2 size={16} />
                <span>{t('delete')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('age')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.age} <span className="text-sm text-slate-500 font-medium">{t('years')}</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('gender')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.gender === 'Male' ? t('gender_male') : patient.gender === 'Female' ? t('gender_female') : t('gender_other')}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('grafts')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.grafts ? patient.grafts.toLocaleString() : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('tech')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.technique || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Photos */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center space-x-3">
              <div className="p-2 bg-promed-light rounded-lg text-promed-primary border border-promed-primary/20">
                <Camera size={20} />
              </div>
              <span>{t('before_operation')}</span>
            </h3>
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer shadow-inner relative group border border-slate-200" onClick={() => setSelectedImage(patient.beforeImage || null)}>
              {patient.beforeImage ? (
                <>
                  <ImageWithFallback src={patient.beforeImage} className="w-full h-full object-cover hover:scale-105 transition duration-700 ease-in-out" alt="Before" fallbackType="image" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">{t('no_image')}</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-800 flex items-center space-x-3">
                <div className="p-2 bg-promed-light rounded-lg text-promed-primary border border-promed-primary/20">
                  <Activity size={20} />
                </div>
                <span>{t('progress')}</span>
              </h3>
              <label className="cursor-pointer text-xs bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition flex items-center space-x-2 font-bold shadow-lg shadow-slate-300">
                <Upload size={14} />
                <span>{t('add_photo')}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {patient.afterImages.map((img, idx) => (
                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer group shadow-sm border border-slate-200" onClick={() => setSelectedImage(img.url)}>
                  <ImageWithFallback src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={img.label} fallbackType="image" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                    <p className="text-white text-xs text-center font-bold tracking-wide drop-shadow-md">{img.label}</p>
                  </div>
                </div>
              ))}
              {patient.afterImages.length === 0 && (
                <div className="col-span-2 py-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Camera size={32} className="opacity-20 mb-2" />
                  <p className="text-sm font-medium">{t('no_progress')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Injection Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-8 shadow-card border border-slate-200 h-full relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-promed-light/40 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="font-bold text-slate-800 flex items-center space-x-3 text-lg">
                <div className="p-2 bg-promed-light rounded-lg text-promed-primary border border-promed-primary/20">
                  <Syringe size={22} />
                </div>
                <span>{t('injection_schedule')}</span>
              </h3>
              <button
                onClick={openAddInjection}
                className="flex items-center space-x-2 text-sm bg-promed-primary text-white px-4 py-2.5 rounded-xl hover:bg-teal-800 transition font-bold active:scale-95 shadow-md shadow-teal-900/10"
              >
                <Plus size={16} />
                <span>{t('add_injection')}</span>
              </button>
            </div>

            <div className="space-y-6 pl-4 relative z-10">
              {patient.injections.map((inj, index) => {
                const isPast = new Date(inj.date) < new Date();
                const isToday = new Date(inj.date).toDateString() === new Date().toDateString();

                return (
                  <div key={inj.id} className="relative flex gap-6 group">
                    {/* Vertical Line */}
                    {index !== patient.injections.length - 1 && (
                      <div className="absolute left-[11px] top-10 bottom-[-24px] w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>
                    )}

                    {/* Indicator Dot */}
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-full border-[3px] z-10 mt-1 shadow-sm transition-all duration-300
                      ${inj.status === InjectionStatus.COMPLETED ? 'bg-emerald-500 border-white ring-2 ring-emerald-200' :
                        inj.status === InjectionStatus.MISSED ? 'bg-red-500 border-white ring-2 ring-red-200' :
                          isToday ? 'bg-amber-500 border-white ring-2 ring-amber-200 scale-110' : 'bg-white border-slate-300'}
                    `} />

                    {/* Content */}
                    <div className="flex-1 bg-slate-50/50 rounded-2xl p-5 hover:bg-white hover:shadow-card hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className={`font-bold text-base ${isToday ? 'text-amber-700' : 'text-slate-800'}`}>
                              {t('injection')} #{index + 1}
                            </h4>
                            {/* Actions Container */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                              <button
                                type="button"
                                onClick={(e) => handleEditClick(e, inj)}
                                className="p-1.5 text-slate-400 hover:text-promed-primary hover:bg-white rounded-lg transition-all"
                                title={t('edit_injection')}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClick(e, inj.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                title={t('delete')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 flex items-center space-x-2 mt-2 font-medium">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{new Date(inj.date).toLocaleDateString(localeString, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </p>
                          {inj.notes && (
                            <div className="mt-3 flex items-start space-x-2">
                              <div className="mt-1 w-1 h-full bg-promed-primary/30 rounded-full"></div>
                              <p className="text-sm text-slate-600 italic leading-relaxed">"{inj.notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Status / Quick Actions */}
                        <div className="flex flex-col items-end gap-2">
                          {inj.status === InjectionStatus.SCHEDULED ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onUpdateInjection(patient.id, inj.id, InjectionStatus.COMPLETED)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 transition shadow-sm"
                              >
                                <Check size={14} /> <span>{t('mark_done')}</span>
                              </button>
                              <button
                                onClick={() => onUpdateInjection(patient.id, inj.id, InjectionStatus.MISSED)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition shadow-sm"
                              >
                                <X size={14} /> <span>{t('mark_missed')}</span>
                              </button>
                            </div>
                          ) : (
                            <span className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm border ${inj.status === InjectionStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                              {translateStatus(inj.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Image Full View Modal */}
      {selectedImage && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition">
              <X size={36} />
            </button>
            <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300" />
          </div>
        </Portal>
      )}

      {/* Injection Add/Edit Modal */}
      <InjectionModal
        isOpen={isInjModalOpen}
        onClose={() => setInjModalOpen(false)}
        onSave={handleSaveInjection}
        initialData={editingInj ? { date: editingInj.date, notes: editingInj.notes } : undefined}
      />

      {/* Photo Label Modal */}
      <PhotoLabelModal
        isOpen={isPhotoModalOpen}
        image={tempPhoto}
        onClose={() => setPhotoModalOpen(false)}
        onSave={handleSavePhoto}
      />
    </div>
  );
};

// ... imports

// --- Add/Edit Patient Form (Refined Modal) ---
export const AddPatientForm: React.FC<{
  onSave: (patient: Patient, files?: { profileImage?: File; beforeImage?: File }) => void;
  onCancel: () => void;
  initialData?: Patient;
  saving?: boolean;
}> = ({ onSave, onCancel, initialData, saving = false }) => {
  const { t } = useLanguage();

  // States
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  const [age, setAge] = useState(initialData?.age?.toString() || '');
  const [gender, setGender] = useState<Patient['gender']>(initialData?.gender || 'Male');
  const [operationDate, setOperationDate] = useState(initialData?.operationDate || new Date().toISOString().split('T')[0]);
  const [grafts, setGrafts] = useState(initialData?.grafts?.toString() || '');
  const [technique, setTechnique] = useState(initialData?.technique || '');
  const [profileImage, setProfileImage] = useState(initialData?.profileImage || '');
  const [beforeImage, setBeforeImage] = useState(initialData?.beforeImage || '');

  // File states for upload
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate form before submission
  const validateForm = (): string | null => {
    if (!fullName.trim()) {
      return t('validation_name_required') || 'Full name is required';
    }
    if (!phone.trim()) {
      return t('validation_phone_required') || 'Phone number is required';
    }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return t('validation_age_invalid') || 'Please enter a valid age (1-120)';
    }
    if (!technique) {
      return t('validation_technique_required') || 'Please select a technique';
    }
    if (!operationDate) {
      return t('validation_date_required') || 'Operation date is required';
    }
    return null;
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, setPreview: (s: string) => void, setFile: (f: File) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image before preview
      const compressedFile = await compressImage(file);
      console.log('Patient image compressed:',
        `${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      setFile(compressedFile);
      // Create a stable object URL instead of reading as base64 to prevent flickering
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreview(objectUrl);

      // Cleanup object URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    const newPatient: Patient = {
      id: initialData?.id || Date.now().toString(),
      fullName,
      phone,

      age: parseInt(age) || 0,
      gender,
      operationDate,
      grafts: parseInt(grafts) || 0,
      technique,
      profileImage: profileImage || `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=random`,
      beforeImage,
      afterImages: initialData?.afterImages || [],
      injections: initialData?.injections || [],
      status: initialData?.status || 'Active'
    };

    // Pass files if they exist
    onSave(newPatient, {
      profileImage: profileImageFile || undefined,
      beforeImage: beforeImageFile || undefined
    });
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
        <div
          className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform scale-100 transition-all border border-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Premium Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                {initialData ? (
                  <>
                    <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Edit2 size={20} /></div>
                    {t('edit_patient_title')}
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-promed-primary/10 rounded-xl text-promed-primary"><PlusCircle size={20} /></div>
                    {t('new_patient_reg')}
                  </>
                )}
              </h3>
              <p className="text-slate-500 text-sm mt-1 font-medium">{t('enter_patient_details')}</p>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2.5 rounded-full transition duration-200">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            <form id="patient-form" onSubmit={handleSubmit} className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">

                {/* Left Column: Photos & Visuals */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                  {/* Profile Photo Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-promed-primary to-teal-400"></div>
                    <h4 className="font-bold text-slate-800 mb-4 self-start flex items-center gap-2 text-sm uppercase tracking-wide">
                      <User size={16} className="text-promed-primary" />
                      {t('profile_photo')}
                    </h4>

                    <label className="relative mb-4 cursor-pointer group/photo">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 shadow-xl ring-4 ring-slate-50 group-hover/photo:ring-promed-primary/30 group-hover/photo:scale-105 group-hover/photo:shadow-2xl group-hover/photo:shadow-promed-primary/20 transition-all duration-500 relative">
                        {profileImage ? (
                          <ImageWithFallback src={profileImage} alt="Profile" className="w-full h-full object-cover group-hover/photo:scale-110 transition duration-700" fallbackType="user" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300 group-hover/photo:bg-promed-primary/5 transition-colors duration-500">
                            <User size={64} strokeWidth={1.5} className="group-hover/photo:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-500">
                          <Camera className="text-white drop-shadow-md transform scale-90 group-hover/photo:scale-110 group-hover/photo:-translate-y-1 transition duration-500" size={32} />
                        </div>
                      </div>

                      {/* Floating camera icon cue */}
                      <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 group-hover/photo:bg-promed-primary group-hover/photo:text-white transition-all duration-300 group-hover/photo:scale-110 group-hover/photo:translate-x-1">
                        <Camera size={18} />
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setProfileImage, setProfileImageFile)} />
                    </label>
                    <p className="text-xs text-slate-500 font-medium">{t('click_upload')}</p>
                  </div>

                  {/* Before Photo Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 group flex-1">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <ImageIcon size={16} className="text-promed-primary" />
                      {t('before_photo')}
                    </h4>

                    <label className="block w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-promed-primary/60 hover:bg-promed-primary/[0.02] transition-all relative group/upload duration-500">
                      {beforeImage ? (
                        <>
                          <ImageWithFallback src={beforeImage} alt="Before" className="w-full h-full object-cover group-hover/upload:scale-110 transition duration-700" fallbackType="image" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/30 text-white transform scale-90 group-hover/upload:scale-100 transition duration-300">
                              <Camera size={24} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 group-hover/upload:text-promed-primary transition-colors duration-300">
                          <div className="p-4 rounded-full bg-slate-50 group-hover/upload:bg-promed-primary/10 group-hover/upload:scale-110 transition-all duration-500">
                            <Upload size={32} strokeWidth={1.5} className="group-hover/upload:-translate-y-1 transition-transform duration-300" />
                          </div>
                          <span className="text-sm font-bold tracking-tight">{t('upload_image')}</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setBeforeImage, setBeforeImageFile)} />
                    </label>
                  </div>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="w-full lg:w-2/3 space-y-8">
                  {/* Personal Specs */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <User size={18} className="text-promed-primary" />
                      {t('personal_info')}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('full_name')}</label>
                        <div className="relative group">
                          <User size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-promed-primary transition-colors" />
                          <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="Mirjalol Shamsiddinov" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('phone_number')}</label>
                        <div className="relative group">
                          <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-promed-primary transition-colors" />
                          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="+998 93 748 91 41" />
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('age')}</label>
                        <input required type="number" value={age} onChange={e => setAge(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                          placeholder="32" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('gender')}</label>
                        <CustomSelect
                          value={gender}
                          onChange={(val) => setGender(val as any)}
                          options={[
                            { value: 'Male', label: t('gender_male') },
                            { value: 'Female', label: t('gender_female') },
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Specs */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <Activity size={18} className="text-promed-primary" />
                      {t('medical_details')}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <DatePicker
                          label={t('operation_date')}
                          value={operationDate}
                          onChange={setOperationDate}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('technique')}</label>
                        <CustomSelect
                          value={technique}
                          onChange={setTechnique}
                          placeholder={t('select_tech')}
                          options={[
                            { value: 'FUE', label: 'FUE' },
                            { value: 'DHI', label: 'DHI' },
                            { value: 'Sapphire FUE', label: 'Sapphire FUE' },
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('grafts')}</label>
                        <div className="relative group">
                          <Hash size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-promed-primary transition-colors" />
                          <input type="number" value={grafts} onChange={e => setGrafts(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="2500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="px-8 py-5 border-t border-slate-100 bg-white flex-shrink-0 z-20">
            {/* Validation Error Display */}
            {validationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm font-medium">
                <X size={16} className="flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 transition rounded-xl hover:bg-slate-50 text-sm">
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="patient-form"
                disabled={saving}
                className="px-8 py-3 bg-promed-primary text-white font-bold rounded-xl hover:bg-teal-800 shadow-lg shadow-teal-900/20 transition transform active:scale-95 flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('saving') || 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{t('save_patient')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
