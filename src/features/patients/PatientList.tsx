import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from "canvas-confetti";
import { useAppSounds } from '../../hooks/useAppSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { ProBadge } from '../../components/ui/ProBadge';
import {
  Calendar,
  MapPin,

  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Upload,

  Syringe,
  Activity,
  Wand2,
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
  Crown,
  ArrowRight,
  Eye,
  Pencil,
  Phone,
  Camera,
  ImageIcon,
  Loader2,
  DollarSign,
  Wallet
} from 'lucide-react';
import { Patient, InjectionStatus, Injection } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import thinkingMascot from '../../assets/images/patients.png'; // Fallback
import injectionMascot from '../../assets/images/injection.png';
import { DatePicker } from '../../components/ui/DatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { Portal } from '../../components/ui/Portal';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { compressImage } from '../../lib/imageOptimizer';
import { patientSchema, safeValidate } from '../../lib/validation';
import DeleteModal from '../../components/ui/DeleteModal';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageUploadingOverlay } from '../../components/ui/ImageUploadingOverlay';
import { InjectionTimeline } from '../../components/ui/InjectionTimeline';
import { AnimateIcon } from '../../components/ui/AnimateIcon';
import { PatientFinanceStats } from './PatientFinanceStats';
import { useAccount } from '../../contexts/AccountContext';


// Re-importing to force build update
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';

import { useReliableUpload } from '../../hooks/useReliableUpload';
import trashIcon from '../../assets/images/patients.png'; // Fallback for missing trash.png
import happyIcon from '../../components/mascot/happy_mascot.png';

// Fallback for missing date.png removed as unused
import editIcon from '../../assets/images/patients.png'; // Fallback for missing edit.png

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

  // Parse Initial Date & Time
  // If ISO string (e.g. 2025-01-08T09:00), split it.
  const initialDateObj = initialData?.date ? new Date(initialData.date) : new Date();

  // Helpers for YYYY-MM-DD and HH:mm
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];
  const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5); // "09:00"

  const [date, setDate] = useState(initialData?.date ? toDateStr(initialDateObj) : toDateStr(new Date()));
  const [time, setTime] = useState(initialData?.date && initialData.date.includes('T') ? toTimeStr(initialDateObj) : '09:00');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      if (initialData?.date) {
        const d = new Date(initialData.date);
        setDate(toDateStr(d));
        // Only set time if likely intentional (e.g., has 'T' or we decide all have time)
        // For standard Date only, default to 09:00
        setTime(initialData.date.includes('T') ? toTimeStr(d) : '09:00');
      } else {
        setDate(toDateStr(new Date()));
        setTime('09:00');
      }
      setNotes(initialData?.notes || '');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    // Combine Date + Time
    const fullDateTime = `${date}T${time}:00`;
    onSave(fullDateTime, notes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-[90vw] md:max-w-md p-6 md:p-8 transform scale-100 transition-all border border-slate-200 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{initialData ? t('edit_injection') : t('add_injection')}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition p-2 hover:bg-slate-100 rounded-full bg-slate-50"><X size={20} /></button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              {/* DATE PICKER */}
              <div>
                <DatePicker
                  label={t('date')}
                  value={date}
                  onChange={setDate}
                />
              </div>

              {/* TIME PICKER */}
              <div>
                <TimePicker
                  label={t('time') || "Time"}
                  value={time}
                  onChange={setTime}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 focus:border-promed-primary/30 rounded-2xl h-32 resize-none transition-all text-slate-900 placeholder-slate-400 font-medium focus:bg-white outline-none"
                placeholder={t('enter_notes')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onClose}
                className="h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-900 text-[15px] font-semibold rounded-2xl transition-colors active:scale-95 duration-200 whitespace-nowrap"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                className="btn-premium-blue h-12 flex items-center justify-center active:scale-95 duration-200 shadow-md shadow-promed-primary/20 text-[15px] font-semibold whitespace-nowrap"
              >
                <span>{t('save')}</span>
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
    onSave(`${value} ${translatedUnit} `);
    setValue('');
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-slate-900/70 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-apple">
          <h3 className="text-xl font-bold mb-4 text-slate-800">{t('photo_label_title')}</h3>
          <div className="flex justify-center mb-6 bg-slate-50 rounded-xl p-2 border border-slate-200">
            <div className="h-48 w-full max-w-[300px] mx-auto overflow-hidden rounded-lg  border border-slate-100">
              <img src={image} alt="Preview" className="w-full h-full object-contain" />
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
                  className="w-full p-3 bg-white border border-slate-400 rounded-xl outline-none transition-all text-slate-900 font-medium"
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
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                onClick={onClose}
                className="h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm whitespace-nowrap px-1"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!value}
                className="btn-premium-blue h-12 flex items-center justify-center active:scale-95 duration-200 shadow-md shadow-promed-primary/20 text-[15px] font-semibold whitespace-nowrap"
              >
                <span>{t('save')}</span>
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

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- Reset Page on Search ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, patients.length]);

  // --- Computation ---
  const totalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  // Simple slice (removed useMemo to prevent stale closure issues)
  const currentPatients = patients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // --- SAFETY RESETS ---
  useEffect(() => {
    // If we have patients but current view is empty (e.g. deleted last item on page 2), reset to page 1
    if (patients.length > 0 && currentPatients.length === 0) {
      console.warn("⚠️ PatientList: Page empty but data exists. Resetting to Page 1.");
      setCurrentPage(1);
    }
  }, [patients.length, currentPatients.length]);

  const startCount = patients.length > 0 ? startIndex + 1 : 0;
  const endCount = Math.min(startIndex + ITEMS_PER_PAGE, patients.length);


  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  // Generate page numbers for display
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Simple logic for large page counts: Show 1, 2, ..., curr-1, curr, curr+1, ..., last
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-premium">
      {/* List Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-end gap-4 bg-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary/50 transition-all font-medium text-sm"
            />
          </div>
          {/* Add Button */}
          <button
            onClick={onAddPatient}
            className="btn-premium-blue flex items-center justify-center w-full md:w-auto gap-2 px-5 py-2.5 whitespace-nowrap shadow-lg shadow-promed-primary/20"
          >
            <PlusCircle size={18} className="relative z-10" />
            <span className="relative z-10 font-bold">{t('add_new_patient')}</span>
          </button>
        </div>
      </div>



      {/* MOBILE CARD VIEW (Visible only on mobile) */}
      <div className="block md:hidden">
        {currentPatients.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {currentPatients.map((patient) => {
              const nextInj = patient.injections.find(i => i.status === InjectionStatus.SCHEDULED && new Date(i.date) >= new Date());
              return (
                <div
                  key={patient.id}
                  className="p-4 active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onSelect(patient.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <ProfileAvatar
                        src={patient.profileImage}
                        alt={patient.fullName}
                        size={48}
                        className="rounded-xl ring-1 ring-slate-100"
                        fallbackType="user"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-slate-800 text-base">{patient.fullName}</div>
                          {patient.tier === 'pro' && <ProBadge size={22} />}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {patient.gender === 'Male' ? t('gender_male') : patient.gender === 'Female' ? t('gender_female') : t('gender_other')}, {patient.age}y
                        </div>
                      </div>
                    </div>
                    {/* Technique Badge */}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider ${patient.technique === 'Hair' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      patient.technique === 'Eyebrow' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                      {patient.technique === 'Hair' ? t('transplant_hair') :
                        patient.technique === 'Eyebrow' ? t('transplant_eyebrow') :
                          patient.technique === 'Beard' ? t('transplant_beard') : (patient.technique || 'N/A')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 pl-[60px]">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('operation_date')}</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(patient.operationDate).toISOString().split('T')[0].split('-').reverse().join('.')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('next_injection')}</p>
                      {nextInj ? (
                        <p className="text-sm font-bold text-blue-600 bg-blue-50 inline-block px-1.5 rounded">
                          {new Date(nextInj.date).toISOString().split('T')[0].split('-').reverse().join('.')}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">{t('none_scheduled')}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              message={t('empty_patient_list_title') || "No Patients Found"}
            />
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible only on desktop) */}
      <div className="w-full overflow-x-auto no-scrollbar min-h-[400px] hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-transparent text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3 md:p-5 pl-4 md:pl-8">{t('name')}</th>
              <th className="p-3 md:p-5">{t('operation_date')}</th>
              <th className="p-3 md:p-5">{t('next_injection')}</th>
              <th className="p-3 md:p-5">{t('technique')}</th>
            </tr>
          </thead>
          <tbody className="divide-y-0 relative">
            {currentPatients.length > 0 ? (
              currentPatients.map((patient, idx) => {
                const nextInj = patient.injections.find(i => i.status === InjectionStatus.SCHEDULED && new Date(i.date) >= new Date());
                return (
                  <tr
                    key={patient.id}
                    className="bg-white border-b border-slate-100 hover:scale-[1.01] hover:shadow-md hover:z-10 relative transition-all duration-200 cursor-pointer group"
                    onClick={() => onSelect(patient.id)}
                  >
                    <td className="p-3 md:p-5 pl-4 md:pl-8 rounded-l-xl group-hover:rounded-l-xl transition-all relative">
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-promed-primary rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <ProfileAvatar
                            src={patient.profileImage}
                            alt={patient.fullName}
                            size={44}
                            className="rounded-xl  ring-1 ring-slate-100"
                            fallbackType="user"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="font-bold text-slate-800 text-sm group-hover:text-promed-primary transition-colors">{patient.fullName}</div>
                            {patient.tier === 'pro' && <ProBadge size={18} />}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">{patient.gender === 'Male' ? t('gender_male') : patient.gender === 'Female' ? t('gender_female') : t('gender_other')}, {patient.age}y</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 md:p-5 text-sm font-medium text-slate-700">
                      {new Date(patient.operationDate).toISOString().split('T')[0].split('-').reverse().join('.')}
                    </td>
                    <td className="p-3 md:p-5">
                      {nextInj ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                            {new Date(nextInj.date).toISOString().split('T')[0].split('-').reverse().join('.')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">{t('none_scheduled')}</span>
                      )}
                    </td>
                    <td className="p-3 md:p-5 rounded-r-xl group-hover:rounded-r-xl transition-all">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center space-x-1.5 border ${patient.technique === 'Hair' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        patient.technique === 'Eyebrow' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${patient.technique === 'Hair' ? 'bg-indigo-600' :
                          patient.technique === 'Eyebrow' ? 'bg-rose-600' : 'bg-slate-600'
                          }`}></span>
                        <span>
                          {patient.technique === 'Hair' ? t('transplant_hair') :
                            patient.technique === 'Eyebrow' ? t('transplant_eyebrow') :
                              patient.technique === 'Beard' ? t('transplant_beard') : (patient.technique || 'N/A')}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr key="empty">
                <td colSpan={4} className="p-12">
                  <EmptyState
                    message={t('empty_patient_list_title') || "No Patients Found"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination Footer --- */}
      {patients.length > 0 && (
        <div className="flex items-center justify-center border-t border-slate-100 p-6 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="btn-premium-white !p-2.5"
              aria-label={t('previous_page') || "Previous Page"}
            >
              <ChevronLeft size={20} className="relative z-10 opacity-70" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[38px] h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === page
                      ? 'btn-premium-blue-sq !p-0 shadow-promed-primary/20'
                      : 'btn-premium-white !p-0 !min-w-[38px]'
                      }`}
                  >
                    <span className="relative z-10">{page}</span>
                  </button>
                ) : (
                  <span key={idx} className="w-10 h-10 flex items-center justify-center text-slate-400 text-sm font-black tracking-widest">
                    {page}
                  </span>
                )
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="btn-premium-white !p-2.5"
              aria-label={t('next_page') || "Next Page"}
            >
              <ChevronRight size={20} className="relative z-10 opacity-70" />
            </button>
          </div>
        </div>
      )}
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
  onDeleteAfterPhoto: (pId: string, photoId: string) => void;
  onEditPatient: () => void;
  onDeletePatient: () => void;
}> = ({ patient, onBack, onUpdateInjection, onAddInjection, onEditInjection, onDeleteInjection, onAddAfterPhoto, onDeleteAfterPhoto, onEditPatient, onDeletePatient }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { playConfetti } = useAppSounds();
  const [isInjModalOpen, setInjModalOpen] = useState(false);
  const [editingInj, setEditingInj] = useState<Injection | null>(null);

  const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);

  const [photoToDeleteId, setPhotoToDeleteId] = useState<string | null>(null);
  const [injToDeleteId, setInjToDeleteId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'finance'>('general');
  const { accountId } = useAccount();

  const [optimisticPhotos, setOptimisticPhotos] = useState<{ id: string, url: string, label: string }[]>([]);

  // Sync optimistic photos with real data
  useEffect(() => {
    if (optimisticPhotos.length > 0 && patient.afterImages.length > 0) {
      const latestReal = patient.afterImages[0];
      // If we find a real image with the same label as our oldest optimistic one, we assume it's synced
      // (Using a fuzzy match since ID is new)
      const matchIndex = optimisticPhotos.findIndex(op => op.label === latestReal.label);
      if (matchIndex !== -1) {
        // Remove the matched optimistic photo
        setOptimisticPhotos(prev => prev.filter((_, idx) => idx !== matchIndex));
      }
    }
  }, [patient.afterImages, optimisticPhotos]);

  const { language, t } = useLanguage();
  const localeString = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
  const translateStatus = useStatusTranslation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image before preview
      const compressedFile = await compressImage(file);
      console.log('After photo compressed:',
        `${(file.size / 1024).toFixed(0)} KB → ${(compressedFile.size / 1024).toFixed(0)} KB`);

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
      // Optimistic Add
      const tempId = `temp_${Date.now()}`;
      setOptimisticPhotos(prev => [{ id: tempId, url: tempPhoto, label }, ...prev]);

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
    setInjToDeleteId(injId);
  };

  const confirmDeleteInjection = () => {
    if (injToDeleteId) {
      onDeleteInjection(patient.id, injToDeleteId);
      setInjToDeleteId(null);
    }
  };

  const handleDeleteAfterPhotoClick = (photoId: string) => {
    setPhotoToDeleteId(photoId);
  };

  const confirmDeletePhoto = () => {
    if (photoToDeleteId) {
      onDeleteAfterPhoto(patient.id, photoToDeleteId);
      setPhotoToDeleteId(null);
    }
  };

  // Find the next upcoming injection
  const nextUpcomingInjection = [...patient.injections]
    .filter(inj => inj.status === InjectionStatus.SCHEDULED)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .find(inj => new Date(inj.date).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0));

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 hover:text-promed-primary transition mb-2 font-bold hover:-translate-x-1 duration-200 px-1">
        <ChevronLeft size={20} />
        <span>{t('back_to_list')}</span>
      </button>

      {/* Header Info */}
      <div className="bg-white rounded-3xl p-4 md:p-8 border border-slate-200 flex flex-col md:flex-row gap-8 relative overflow-hidden shadow-apple">
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-promed-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex-shrink-0 relative w-40 h-40">
          <img
            src={patient.profileImage || "https://via.placeholder.com/150?text=No+Image"}
            alt={patient.fullName}
            className="w-full h-full rounded-2xl object-cover ring-4 ring-white border border-slate-100"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Error";
            }}
          />
        </div>

        <div className="flex-1 space-y-6 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center flex-nowrap gap-1 whitespace-nowrap overflow-hidden">
                <span className="truncate">{patient.fullName}</span>
                {patient.tier === 'pro' && <div className="flex-shrink-0"><ProBadge size={32} /></div>}
              </h2>
              <div className="flex flex-wrap items-center gap-6 text-slate-600 mt-3">
                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-sm">{t('operation_date')}: {new Date(patient.operationDate).toISOString().split('T')[0].split('-').reverse().join('-')}</span>
                </span>
                <span className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Phone className="w-4 h-4 text-slate-400" />
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
                className="btn-premium-white !px-5 !py-2.5"
              >
                <Pencil className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{t('edit_patient')}</span>
              </button>
              <button
                onClick={onDeletePatient}
                className="btn-premium-white !px-5 !py-2.5 !text-red-600 !border-red-200 hover:!bg-red-50 group/del"
              >
                <Trash2 className="w-5 h-5 relative z-10 group-hover/del:scale-110 transition-transform" />
                <span className="relative z-10">{t('delete')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-apple hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('age')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.age} <span className="text-sm text-slate-500 font-medium">{t('years')}</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-apple hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('gender')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.gender === 'Male' ? t('gender_male') : patient.gender === 'Female' ? t('gender_female') : t('gender_other')}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-apple hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('grafts')}</p>
              <p className="font-bold text-xl text-slate-800">{patient.grafts ? patient.grafts.toLocaleString() : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-apple hover:border-promed-primary/50 transition-colors">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{t('tech')}</p>
              <p className="font-bold text-xl text-slate-800">
                {patient.technique === 'Hair' ? t('transplant_hair') :
                  patient.technique === 'Eyebrow' ? t('transplant_eyebrow') :
                    patient.technique === 'Beard' ? t('transplant_beard') :
                      (patient.technique || 'N/A')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-start mb-8">
        <div className="relative inline-flex items-center bg-slate-100/80 rounded-2xl p-1.5 border border-slate-200/60 shadow-sm">
          <button
            onClick={() => setActiveTab('general')}
            className={`relative z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-colors duration-200 ${activeTab === 'general' ? 'text-promed-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {activeTab === 'general' && (
              <motion.div
                layoutId="activeTabPill"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-white shadow-md shadow-slate-900/8 border border-slate-200/50"
              />
            )}
            <User size={16} strokeWidth={2.5} className="relative z-10" />
            <span className="relative z-10">{t('general_info') || "General Info"}</span>
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`relative z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-colors duration-200 ${activeTab === 'finance' ? 'text-promed-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {activeTab === 'finance' && (
              <motion.div
                layoutId="activeTabPill"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-white shadow-md shadow-slate-900/8 border border-slate-200/50"
              />
            )}
            <Wallet size={16} strokeWidth={2.5} className="relative z-10" />
            <span className="relative z-10">{t('finance') || "Finance"}</span>
          </button>
        </div>
      </div>

      {
        activeTab === 'general' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Left Col: Photos */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-2xl p-6 shadow-apple border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center space-x-3">
                  <div className="">
                    <Camera className="w-9 h-9 text-slate-700" />
                  </div>
                  <span>{t('before_operation')}</span>
                </h3>
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 cursor-pointer relative group border border-slate-200" onClick={() => setSelectedImage(patient.beforeImage || null)}>
                  {patient.beforeImage ? (
                    <>
                      <ImageWithFallback src={patient.beforeImage} optimisticId={`${patient.id}_before`} className="w-full h-full object-cover hover:scale-105 transition duration-700 ease-in-out" alt="Before" fallbackType="image" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">{t('no_image')}</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-apple border border-slate-200">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-slate-800 flex items-center space-x-3">
                    <div className="p-2 bg-promed-light rounded-lg text-promed-primary border border-promed-primary/20">
                      <Activity size={20} />
                    </div>
                    <span>{t('progress')}</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Add Photo Card */}
                  <label className="cursor-pointer aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-promed-primary hover:text-promed-primary hover:bg-promed-primary/5 transition-all duration-300 bg-slate-50/50 group">
                    <PlusCircle size={28} className="group-hover:scale-110 transition-transform mb-1.5 opacity-60 group-hover:opacity-100" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">{t('add_photo')}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>

                  {/* Optimistic Photos (Pending) */}
                  {optimisticPhotos.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-promed-primary/30 shadow-sm animate-pulse">
                      <ImageWithFallback
                        src={img.url}
                        optimisticId={img.id}
                        className="w-full h-full object-cover object-center opacity-80"
                        alt={img.label}
                        fallbackType="image"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-promed-primary/80 via-promed-primary/20 to-transparent p-4 pt-12 flex flex-col justify-end">
                        <p className="text-white text-sm font-bold tracking-wide drop-shadow-md">{img.label}</p>
                        <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Saving...
                        </p>
                      </div>
                    </div>
                  ))}

                  {patient.afterImages.map((img, idx) => (
                    <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 cursor-pointer group border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300" onClick={() => setSelectedImage(img.url)}>
                      <ImageWithFallback
                        src={img.url}
                        optimisticId={img.id}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-700 ease-in-out"
                        alt={img.label}
                        fallbackType="image"
                      />

                      {/* Delete Button (Hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAfterPhotoClick(img.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shadow-sm z-20 hover:scale-110"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Gradient & Label */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 pt-12 flex flex-col justify-end">
                        <p className="text-white text-sm font-bold tracking-wide drop-shadow-md">{img.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Injection Timeline */}
            <div className="lg:col-span-2">
              <InjectionTimeline
                injections={patient.injections}
                onAddInjection={openAddInjection}
                onEditInjection={(inj) => openEditInjection(inj)}
                onDeleteInjection={(id, e) => handleDeleteClick(e, id)}
                onUpdateStatus={(id, status) => onUpdateInjection(patient.id, id, status)}
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {accountId && <PatientFinanceStats patient={patient} accountId={accountId} />}
          </div>
        )
      }


      {/* Image Full View Modal */}
      {
        selectedImage && (
          <Portal>
            <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
              <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition">
                <X size={36} />
              </button>
              <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-xl scale-100 animate-in zoom-in-95 duration-300" />
            </div>
          </Portal>
        )
      }

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

      <DeleteModal
        isOpen={!!photoToDeleteId}
        onClose={() => setPhotoToDeleteId(null)}
        onConfirm={confirmDeletePhoto}
      />

      <DeleteModal
        isOpen={!!injToDeleteId}
        onClose={() => setInjToDeleteId(null)}
        onConfirm={confirmDeleteInjection}
      />
    </div >
  );
};

// ... imports
const formatUzbekPhoneNumber = (value: string) => {
  // Remove all non-digits except +
  let digits = value.replace(/[^\d+]/g, '');

  // Ensure it starts with +998
  if (!digits.startsWith('+998')) {
    digits = '+998' + digits.replace('+998', '').replace('+', '');
  }

  // Format: +998 XX XXX XX XX
  let formatted = '+998';
  const remaining = digits.substring(4).substring(0, 9); // Max 9 more digits

  if (remaining.length > 0) {
    formatted += ' ' + remaining.substring(0, 2);
  }
  if (remaining.length > 2) {
    formatted += ' ' + remaining.substring(2, 5);
  }
  if (remaining.length > 5) {
    formatted += ' ' + remaining.substring(5, 7);
  }
  if (remaining.length > 7) {
    formatted += ' ' + remaining.substring(7, 9);
  }

  return formatted;
};

// --- Add/Edit Patient Form (Refined Modal) ---
export const AddPatientForm: React.FC<{
  onSave: (patient: Patient, files?: { profileImage?: File; beforeImage?: File }, initialPayment?: number) => void;
  onCancel: () => void;
  initialData?: Patient;
  saving?: boolean;
}> = ({ onSave, onCancel, initialData, saving = false }) => {
  const { t, language } = useLanguage();
  const { upload: reliableUpload } = useReliableUpload();

  // FIX: Local loading state for immediate double-click prevention
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '+998 ');

  const [age, setAge] = useState(initialData?.age?.toString() || '');
  const [gender, setGender] = useState<Patient['gender']>(initialData?.gender || 'Male');
  const [operationDate, setOperationDate] = useState(initialData?.operationDate || new Date().toISOString().split('T')[0]);
  const [grafts, setGrafts] = useState(initialData?.grafts?.toString() || '');
  const [technique, setTechnique] = useState(initialData?.technique || '');
  const [tier, setTier] = useState<Patient['tier']>(initialData?.tier || 'regular');
  const [profileImage, setProfileImage] = useState(initialData?.profileImage || '');
  const [beforeImage, setBeforeImage] = useState(initialData?.beforeImage || '');

  // File states for upload
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount?.toString() || '');
  const [initialPayment, setInitialPayment] = useState('');
  const [currency, setCurrency] = useState<Patient['currency']>(initialData?.currency || 'USD');

  // Validate form before submission
  const validateForm = (): string | null => {
    const rawData = {
      fullName,
      phone,
      age: parseInt(age),
      gender,
      technique: technique || undefined,
      grafts: grafts ? parseInt(grafts) : undefined,
      operationDate,
      status: 'Active',
      totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
      currency
    };

    const result = safeValidate(patientSchema, rawData);
    if (result.success === false) {
      return result.error;
    }
    return null;
  };

  // Image states
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [isBeforeUploading, setIsBeforeUploading] = useState(false);

  const handleImageUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (s: string) => void,
    setFile: (f: File) => void,
    setLoading: (l: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. INSTANT: Create Blob and set State immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setLoading(true);

      // 2. THE FIX: Wrap the heavy lifting in a setTimeout
      // 50ms gives the browser plenty of time to paint the preview and start the overlay animation
      setTimeout(async () => {
        try {
          // Compress image in background
          const compressedFile = await compressImage(file);
          console.log('Patient image compressed:',
            `${(file.size / 1024).toFixed(0)} KB → ${(compressedFile.size / 1024).toFixed(0)} KB`);

          setFile(compressedFile);

          // We can update the preview with the compressed one if needed, 
          // but usually the initial blob is fine until save.

        } catch (error) {
          console.error("Compression failed", error);
        } finally {
          setLoading(false);
        }
      }, 10);

      // Cleanup object URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  // --- Auto-Fill Feature (Magic Button) ---
  const handleAutoFill = () => {
    const randomNames = ["Azizbek Tursunov", "Jasur Rahimjonov", "Otabek Nurmatov", "Sardor Kamilov", "Bekzod Alimov"];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomPhone = `+ 998 ${Math.floor(Math.random() * 90 + 90)} ${Math.floor(Math.random() * 899 + 100)} ${Math.floor(Math.random() * 89 + 10)} ${Math.floor(Math.random() * 89 + 10)} `;
    const randomAge = Math.floor(Math.random() * 40 + 20).toString();
    const techniques = ['Hair', 'Eyebrow', 'Beard'];
    const randomTechnique = techniques[Math.floor(Math.random() * techniques.length)];

    setFullName(randomName);
    setPhone(randomPhone);
    setAge(randomAge);
    setGender('Male');
    setTechnique(randomTechnique);
    setOperationDate(new Date().toISOString().split('T')[0]);
    setGrafts(Math.floor(Math.random() * 2000 + 1500).toString());
    setValidationError(null); // Clear errors if any
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Safety Check: Stop if already running (Race Condition Fix)
    if (isSubmitting || saving) return;

    // 2. Lock the door
    setIsSubmitting(true);

    // Validate form before submission
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    let finalProfileUrl = profileImage;
    let finalBeforeUrl = beforeImage;
    const tempId = initialData?.id || `temp-${Date.now()}`;

    // Perform Reliable Uploads
    try {
      const uploadPromises: Promise<string | undefined>[] = [];

      // Profile Image Upload Promise
      const profileUploadPromise = async () => {
        if (profileImageFile) {
          setIsProfileUploading(true);
          const url = await reliableUpload({
            bucket: 'promed-images',
            path: `patients/${tempId}/profile`,
            file: profileImageFile
          });
          setIsProfileUploading(false);
          return url;
        }
        return profileImage; // Return existing/default if no file
      };

      // Before Image Upload Promise
      const beforeUploadPromise = async () => {
        if (beforeImageFile) {
          setIsBeforeUploading(true);
          const url = await reliableUpload({
            bucket: 'promed-images',
            path: `patients/${tempId}/before`,
            file: beforeImageFile
          });
          setIsBeforeUploading(false);
          return url;
        }
        return beforeImage; // Return existing/default if no file
      };

      // Execute in parallel
      const [newProfileUrl, newBeforeUrl] = await Promise.all([
        profileUploadPromise(),
        beforeUploadPromise()
      ]);

      finalProfileUrl = newProfileUrl || profileImage;
      finalBeforeUrl = newBeforeUrl || beforeImage;

    } catch (err: any) {
      setIsProfileUploading(false);
      setIsBeforeUploading(false);
      setValidationError(`Upload failed: ${err.message}`);
      return;
    }

    const newPatient: Patient = {
      id: tempId,
      fullName,
      phone,

      age: parseInt(age) || 0,
      gender,
      operationDate,
      grafts: parseInt(grafts) || 0,
      technique,
      profileImage: finalProfileUrl || `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=random`,
      beforeImage: finalBeforeUrl,
      afterImages: initialData?.afterImages || [],
      injections: initialData?.injections || [],
      status: initialData?.status || 'Active',

      tier,
      totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
      currency
    };

    // Pass EMPTY files object so parent doesn't re-upload

    try {
      await onSave(newPatient, {}, initialPayment ? parseFloat(initialPayment) : undefined);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      // Unlock only after parent logic finishes (or if user stays on form due to error)
      // This is critical to prevent double production during high latency
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
        <div
          className="bg-white w-full max-w-5xl rounded-3xl flex flex-col max-h-[90vh] overflow-hidden transform scale-100 transition-all border border-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Premium Header */}
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                {initialData ? t('edit_patient_title') : t('new_patient_reg')}
              </h3>

            </div>
            <div className="flex items-center gap-2">
              {/* ✨ Magic Auto-Fill Button (Dev Tool) */}

              <button onClick={onCancel} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2.5 rounded-full transition duration-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-premium-card">
            <form id="patient-form" onSubmit={handleSubmit} className="p-4 pb-10 md:p-8" onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
              }
            }}>
              <div className="flex flex-col lg:flex-row gap-8">

                {/* Left Column: Photos & Visuals */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                  {/* Profile Photo Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200 flex flex-col items-center text-center transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-promed-primary to-teal-400"></div>
                    <h4 className="font-bold text-slate-800 mb-4 self-start flex items-center gap-2 text-sm uppercase tracking-wide">
                      <User size={16} className="text-promed-primary" />
                      {t('profile_photo')}
                    </h4>

                    <label className="relative mb-4 cursor-pointer group/photo">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-50 group-hover/photo:ring-promed-primary/30 group-hover/photo:scale-105 transition-all duration-500 relative">
                        {profileImage ? (
                          <ImageWithFallback src={profileImage} alt="Profile" className="w-full h-full object-cover group-hover/photo:scale-110 transition duration-700" fallbackType="user" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300 group-hover/photo:bg-promed-primary/5 transition-colors duration-500">
                            <User size={64} strokeWidth={1.5} className="group-hover/photo:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity duration-500">
                          <Camera className="w-8 h-8 text-white transform scale-90 group-hover/photo:scale-110 group-hover/photo:-translate-y-1 transition duration-500" />
                        </div>
                      </div>

                      {/* Floating camera icon cue */}
                      <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-slate-100 text-slate-600 group-hover/photo:bg-promed-primary group-hover/photo:text-white transition-all duration-300 group-hover/photo:scale-110 group-hover/photo:translate-x-1 z-20 flex items-center justify-center">
                        <Camera className="w-[18px] h-[18px] text-slate-400 group-hover/photo:text-white" />
                      </div>

                      {/* UPLOAD OVERLAY */}


                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setProfileImage, setProfileImageFile, setIsProfileUploading)} />
                    </label>
                    <p className="text-xs text-slate-500 font-medium">{t('click_upload')}</p>
                  </div>

                  {/* Before Photo Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200 transition-all duration-300 group flex-1">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <ImageIcon size={16} className="text-promed-primary" />
                      {t('before_photo')}
                    </h4>

                    <label className="block w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-promed-primary/60 hover:bg-promed-primary/[0.02] transition-all relative group/upload duration-500">
                      {beforeImage ? (
                        <>
                          <ImageWithFallback src={beforeImage} alt="Before" className="w-full h-full object-cover group-hover/upload:scale-110 transition duration-700" fallbackType="image" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/30 text-white transform scale-90 group-hover/upload:scale-100 transition duration-300 flex items-center justify-center">
                              <Camera className="w-6 h-6 text-white" />
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
                      {/* UPLOAD OVERLAY */}

                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setBeforeImage, setBeforeImageFile, setIsBeforeUploading)} />
                    </label>
                  </div>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="w-full lg:w-2/3 space-y-8">
                  {/* Personal Specs */}
                  <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200">
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
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-400 rounded-xl focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="Mirjalol Shamsiddinov" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('phone_number')}</label>
                        <div className="relative group">
                          <Phone className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-slate-400 group-focus-within:text-promed-primary transition-colors" />
                          <input
                            required
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(formatUzbekPhoneNumber(e.target.value))}
                            onKeyDown={(e) => {
                              // Prevent deleting the +998 prefix
                              if (e.key === 'Backspace' && phone === '+998 ') {
                                e.preventDefault();
                              }
                              // Handle case where user tries to move cursor before prefix
                              const input = e.target as HTMLInputElement;
                              if (input.selectionStart !== null && input.selectionStart < 5 && e.key !== 'ArrowRight' && e.key !== 'ArrowDown') {
                                // For simplicity, we just allow ArrowRight/Down to let them out, 
                                // otherwise we jump them back to the end of the prefix
                                // input.setSelectionRange(5, 5);
                              }
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-400 rounded-xl focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="+998 93 748 91 41"
                          />
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('age')}</label>
                        <input required type="number" value={age} onChange={e => setAge(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-400 rounded-xl focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('tier') || 'Status'}</label>
                        <div
                          onClick={() => setTier(tier === 'regular' ? 'pro' : 'regular')}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${tier === 'pro'
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-yellow-400 shadow-apple'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center gap-3 relative z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden ${tier === 'pro' ? 'bg-yellow-100 text-yellow-900 shadow-sm scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                              }`}>
                              {tier === 'pro' ? (
                                <ProBadge size={50} />
                              ) : (
                                <Crown size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm transition-colors ${tier === 'pro' ? 'text-yellow-900' : 'text-slate-600'}`}>
                                {t('tier_pro') || 'Pro Patient (Bonus)'}
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                {tier === 'pro' ? (t('status_active') || 'Active') : (t('status_not_paid') || 'Inactive')}
                              </span>
                            </div>
                          </div>

                          {/* Custom Toggle Switch */}
                          <div className={`w-12 h-7 rounded-full transition-colors duration-300 relative z-10 ${tier === 'pro' ? 'bg-yellow-400' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${tier === 'pro' ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Specs */}
                  <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200">
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
                            { value: 'Hair', label: t('transplant_hair') },
                            { value: 'Eyebrow', label: t('transplant_eyebrow') },
                            { value: 'Beard', label: t('transplant_beard') },
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('grafts')}</label>
                        <div className="relative group">
                          <Hash size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-promed-primary transition-colors" />
                          <input type="number" value={grafts} onChange={e => setGrafts(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-400 rounded-xl focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="2500" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Finance Specs */}
                  <div className="bg-white p-6 rounded-2xl shadow-premium border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">
                      <DollarSign size={18} className="text-promed-primary" />
                      {t('financial_details') || "Financial Details"}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('total_price') || "Total Price"}</label>
                        <div className="relative group">
                          <DollarSign size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input
                            type="number"
                            value={totalAmount}
                            onChange={e => setTotalAmount(e.target.value)}
                            className="w-full pl-10 pr-20 py-3 bg-slate-50 border border-slate-400 rounded-xl focus:bg-white outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
                            placeholder="2500"
                          />
                          <div className="absolute right-2 top-2 bottom-2">
                            <select
                              value={currency}
                              onChange={e => setCurrency(e.target.value as any)}
                              className="h-full bg-slate-100 rounded-lg px-2 text-xs font-bold text-slate-600 border-none focus:ring-0 outline-none"
                            >
                              <option value="USD">USD</option>
                              <option value="UZS">UZS</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Initial Payment - Only for New Patients */}
                      {!initialData && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('initial_payment') || "Initial Payment"}</label>
                          <div className="relative group">
                            <Wallet size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                              type="number"
                              value={initialPayment}
                              onChange={e => setInitialPayment(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:bg-white outline-none transition-all font-medium text-emerald-900 placeholder-emerald-300"
                              placeholder="500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Fixed Footer */}
          <div className="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-white flex-shrink-0 z-20">
            {/* Validation Error Display */}
            {validationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm font-medium">
                <X size={16} className="flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:flex md:justify-end gap-3 md:gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="w-full md:w-auto px-6 py-3.5 text-slate-500 font-bold hover:text-slate-800 transition rounded-xl bg-slate-100 hover:bg-slate-200 text-sm active:scale-95 duration-200"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="patient-form"
                disabled={saving || isSubmitting}
                className="w-full md:w-auto btn-premium-blue !px-8 !py-3.5 flex items-center justify-center gap-2"
              >
                {isSubmitting || saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} className="relative z-10" />
                )}
                <span>{isSubmitting || saving ? t('saving') : t('save')}</span>
              </button>
            </div>
          </div>

          {/* Custom Mascot Loader Overlay for Modal */}
          {(saving || isSubmitting || isProfileUploading || isBeforeUploading) && (
            <div className="absolute inset-0 z-[10000] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-3xl">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full animate-pulse" />
                <img
                  src={happyIcon}
                  alt="Saving"
                  className="relative w-32 h-32 object-contain animate-bounce-gentle drop-shadow-2xl"
                />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                {(isProfileUploading || isBeforeUploading) ? (t('uploading') || "Yuklanmoqda...") : (t('saving') || "Saqlanmoqda...")}
              </h2>
              <p className="text-slate-500 font-medium text-sm animate-pulse">
                {(isProfileUploading || isBeforeUploading)
                  ? (t('uploading_large_image') || "Uploading large image...")
                  : (t('saving_patient_data') || "Saving patient data...")}
              </p>
            </div>
          )}
        </div>
      </div >
    </Portal >
  );
};
