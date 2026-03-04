import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paperclip, Loader2, Video, Megaphone, Search, CheckCircle2, Circle, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../contexts/AuthContext';
import { useAccount } from '../../contexts/AccountContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';
import { Portal } from '../../components/ui/Portal';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
    patients: any[];
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, patients }) => {
    const { user } = useAuth();
    const { accountId, userId } = useAccount();
    const { t } = useLanguage();
    const { showToast } = useToast();

    const [messageInput, setMessageInput] = useState('');
    const [fileAttachment, setFileAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
    const [patientSearch, setPatientSearch] = useState('');
    const [isPatientListExpanded, setIsPatientListExpanded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize all patients as selected when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedPatientIds(new Set(patients.map(p => p.id)));
            setMessageInput('');
            setFileAttachment(null);
            setPatientSearch('');
            setIsPatientListExpanded(false);
            setProgress({ current: 0, total: 0 });
        }
    }, [isOpen, patients]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return patients;
        return patients.filter(p =>
            p.fullName.toLowerCase().includes(patientSearch.toLowerCase())
        );
    }, [patients, patientSearch]);

    const selectedCount = selectedPatientIds.size;
    const isAllSelected = selectedCount === patients.length;

    const togglePatient = (id: string) => {
        setSelectedPatientIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedPatientIds(new Set());
        } else {
            setSelectedPatientIds(new Set(patients.map(p => p.id)));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setFileAttachment(file);
    };

    const handleSendBroadcast = async () => {
        if (!messageInput.trim() && !fileAttachment) return;

        const targetPatients = patients.filter(p => selectedPatientIds.has(p.id));
        if (targetPatients.length === 0) {
            showToast('Xatolik', 'Kamida bitta mijoz tanlang', 'error');
            return;
        }

        setIsSending(true);
        setProgress({ current: 0, total: targetPatients.length });

        try {
            const now = new Date();
            let mediaUrl: string | null = null;
            let mediaType: string | null = null;

            // 1. Upload Media First (Only Once)
            if (fileAttachment) {
                let currentFileToUpload = fileAttachment;
                mediaType = fileAttachment.type.startsWith('video/') ? 'video' : 'image';

                if (mediaType === 'image') {
                    try {
                        const compressionOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                        const compressedBlob = await imageCompression(fileAttachment, compressionOptions);
                        currentFileToUpload = new File([compressedBlob], fileAttachment.name, {
                            type: compressedBlob.type,
                            lastModified: Date.now(),
                        });
                    } catch (err) {
                        console.error('Broadcast image compression failed:', err);
                    }
                }

                const ext = currentFileToUpload.name.split('.').pop();
                const filename = `broadcast_media_${Date.now()}.${ext}`;
                const storageRef = ref(storage, `chat_media/${filename}`);

                mediaUrl = await new Promise<string>((resolve, reject) => {
                    const uploadTask = uploadBytesResumable(storageRef, currentFileToUpload);
                    uploadTask.on('state_changed',
                        null,
                        (error) => reject(error),
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
            }

            // 2. Loop and Send to Selected Patients
            for (let i = 0; i < targetPatients.length; i++) {
                const patient = targetPatients[i];
                const messageData: any = {
                    text: messageInput.trim(),
                    sender: 'doctor',
                    createdAt: now.toISOString(),
                    created_at: serverTimestamp(),
                    timestamp: serverTimestamp(),
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || "00:00",
                    status: 'sent',
                    seen: false,
                    account_id: accountId || userId || 'unknown',
                    accountId: accountId || userId || 'unknown',
                    user_id: userId || 'unknown',
                    userId: userId || 'unknown',
                    type: mediaType || 'text'
                };

                if (mediaUrl) {
                    if (mediaType === 'video') messageData.video = mediaUrl;
                    if (mediaType === 'image') messageData.image = mediaUrl;
                }

                try {
                    const docRef = await addDoc(collection(db, 'patients', patient.id, 'messages'), messageData);

                    await updateDoc(doc(db, 'patients', patient.id), {
                        lastMessage: mediaType ? `[${mediaType === 'video' ? 'Video' : 'Rasm'}] ${messageInput.trim()}` : messageInput.trim(),
                        lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                        lastMessageTimestamp: now.toISOString()
                    });

                    if (patient.telegramChatId) {
                        const payload: any = {
                            telegramChatId: patient.telegramChatId,
                            text: messageInput.trim(),
                            status: 'PENDING',
                            patientId: patient.id,
                            originalMessageId: docRef.id,
                            patientName: patient.fullName,
                            botLanguage: patient.botLanguage || 'uz',
                            action: 'SEND',
                            createdAt: now.toISOString()
                        };
                        if (mediaUrl && mediaType === 'video') payload.videoUrl = mediaUrl;
                        if (mediaUrl && mediaType === 'image') payload.imageUrl = mediaUrl;
                        await addDoc(collection(db, 'outbound_messages'), payload);
                    }
                } catch (err) {
                    console.error(`Failed to send broadcast to ${patient.fullName}:`, err);
                }

                setProgress({ current: i + 1, total: targetPatients.length });
            }

            showToast('Muvaffaqiyatli', `Xabar ${targetPatients.length} ta mijozga yuborildi`, 'success');
            setTimeout(() => {
                setMessageInput('');
                setFileAttachment(null);
                setSelectedPatientIds(new Set());
                onClose();
            }, 800);

        } catch (error) {
            console.error('Broadcast failed:', error);
            showToast('Xatolik', 'Xabar yuborishda xatolik yuz berdi', 'error');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={!isSending ? onClose : undefined}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5 flex items-center justify-between text-white flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Megaphone size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Ommaviy Xabar</h2>
                                        <p className="text-blue-100 text-sm font-medium">
                                            {selectedCount} / {patients.length} mijoz tanlangan
                                        </p>
                                    </div>
                                </div>
                                {!isSending && (
                                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">

                                {/* Patient Selection Section */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    {/* Selection Header */}
                                    <button
                                        onClick={() => setIsPatientListExpanded(!isPatientListExpanded)}
                                        disabled={isSending}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-xl">
                                                <Users size={18} className="text-blue-600" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-sm font-bold text-slate-800 block">Qabul qiluvchilar</span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {selectedCount === patients.length
                                                        ? 'Barcha mijozlar tanlangan'
                                                        : `${selectedCount} ta mijoz tanlangan`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                                {selectedCount}
                                            </span>
                                            {isPatientListExpanded
                                                ? <ChevronUp size={18} className="text-slate-400" />
                                                : <ChevronDown size={18} className="text-slate-400" />
                                            }
                                        </div>
                                    </button>

                                    {/* Expandable Patient List */}
                                    <AnimatePresence>
                                        {isPatientListExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-slate-200">
                                                    {/* Search + Select All */}
                                                    <div className="p-3 flex flex-col gap-2 bg-white">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                            <input
                                                                type="text"
                                                                value={patientSearch}
                                                                onChange={e => setPatientSearch(e.target.value)}
                                                                placeholder="Mijoz qidirish..."
                                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={toggleAll}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 text-left px-1 py-1 transition-colors"
                                                        >
                                                            {isAllSelected ? '✕ Barchasini bekor qilish' : '✓ Barchasini tanlash'}
                                                        </button>
                                                    </div>

                                                    {/* Patient List */}
                                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                        {filteredPatients.map(patient => {
                                                            const isSelected = selectedPatientIds.has(patient.id);
                                                            return (
                                                                <button
                                                                    key={patient.id}
                                                                    onClick={() => togglePatient(patient.id)}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                                                                >
                                                                    {isSelected
                                                                        ? <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0" />
                                                                        : <Circle size={20} className="text-slate-300 flex-shrink-0" />
                                                                    }
                                                                    <ProfileAvatar
                                                                        src={patient.profileImage}
                                                                        alt={patient.fullName}
                                                                        size={32}
                                                                        className="rounded-full ring-1 ring-slate-200 flex-shrink-0"
                                                                        optimisticId={patient.id}
                                                                    />
                                                                    <span className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                                                        {patient.fullName}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                        {filteredPatients.length === 0 && (
                                                            <div className="p-4 text-center text-sm text-slate-400 font-medium">
                                                                Mijoz topilmadi
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* File Attachment */}
                                {fileAttachment ? (
                                    <div className="relative h-40 w-full bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden group flex items-center justify-center">
                                        {fileAttachment.type.startsWith('video/') ? (
                                            <div className="flex flex-col items-center text-slate-500 gap-2">
                                                <Video size={40} className="opacity-50" />
                                                <span className="text-sm font-medium px-4 text-center truncate w-full">{fileAttachment.name}</span>
                                            </div>
                                        ) : (
                                            <img src={URL.createObjectURL(fileAttachment)} alt="Attachment" className="w-full h-full object-cover" />
                                        )}
                                        {!isSending && (
                                            <button
                                                onClick={() => setFileAttachment(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ) : null}

                                {/* Input Area */}
                                <div>
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Xabaringizni yozing (Masalan: Bayramingiz bilan!)..."
                                        disabled={isSending}
                                        className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            disabled={isSending}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSending}
                                            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 text-sm font-medium"
                                            title="Fayl biriktirish"
                                        >
                                            <Paperclip size={18} />
                                            <span>Fayl biriktirish</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar during sending */}
                                {isSending && (
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                                        <motion.div
                                            className="bg-blue-500 h-full rounded-full relative"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 progress-shine" />
                                        </motion.div>
                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-700 mix-blend-difference">
                                            {progress.current} / {progress.total}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer - sticky */}
                            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                                <button
                                    onClick={handleSendBroadcast}
                                    disabled={isSending || (!messageInput.trim() && !fileAttachment) || selectedCount === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Yuborilmoqda... ({progress.current}/{progress.total})
                                        </>
                                    ) : (
                                        <>
                                            {selectedCount > 0
                                                ? `${selectedCount} ta mijozga yuborish`
                                                : 'Mijoz tanlang'
                                            }
                                            <Send size={18} className="ml-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                <style>{`
                @keyframes progress-shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .progress-shine {
                    animation: progress-shine 1s infinite linear;
                }
            `}</style>
            </AnimatePresence>
        </Portal>
    );
};
