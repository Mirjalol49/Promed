import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient } from '../../types';
import { Search, Send, User, Smile, Trash2, Edit2, X, Check, Paperclip, Mic } from 'lucide-react';
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useToast } from '../../contexts/ToastContext';
import DeleteModal from '../../components/ui/DeleteModal';
import { ProBadge } from '../../components/ui/ProBadge';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, limitToLast, startAfter, endBefore, limit, getDocs, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { Play, Pause, Square, Loader2 } from 'lucide-react';

interface MessagesPageProps {
    patients?: Patient[];
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'doctor';
    time: string;
    createdAt: string;
    image?: string;
    voice?: string;
    telegramMessageId?: number;
    status?: 'sent' | 'delivered' | 'seen';
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ patients = [] }) => {
    const { t } = useLanguage();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchText, setSearchText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

    // Optimization State
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [oldestDoc, setOldestDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [patientIsTyping, setPatientIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { error: showToastError, success: showToastSuccess } = useToast();
    const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecorder } = useVoiceRecorder();

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    // Image Upload hook
    const {
        previewUrl,
        uploading: isImageUploading,
        progress,
        handleImageSelect,
        uploadedUrl,
        reset: resetImage
    } = useImageUpload({
        pathPrefix: 'chat_attachments'
    });

    // Filter patients
    const filteredPatients = patients.filter(p =>
        p.fullName.toLowerCase().includes(searchText.toLowerCase())
    );

    // Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, selectedPatientId]);

    // Fetch Messages (with Pagination & Local Cache)
    useEffect(() => {
        if (!selectedPatientId) {
            setMessages([]);
            return;
        }

        // 1. Try Local Cache
        const cached = localStorage.getItem(`msgs_${selectedPatientId}`);
        if (cached) {
            try {
                setMessages(JSON.parse(cached));
            } catch (e) { console.error("Cache parse error", e); }
        }

        // 2. Initial Realtime Listener (Limit to 30)
        const q = query(
            collection(db, 'promed_passengers', selectedPatientId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse() as Message[];

            setMessages(msgs);
            localStorage.setItem(`msgs_${selectedPatientId}`, JSON.stringify(msgs));

            if (snapshot.docs.length > 0) {
                setOldestDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === 30);
            }
        });

        // 3. Hear Typing Status
        const unsubTyping = onSnapshot(doc(db, 'patients', selectedPatientId), (docSnap) => {
            if (docSnap.exists()) {
                setPatientIsTyping(docSnap.data().userIsTyping || false);
            }
        });

        return () => {
            unsubscribe();
            unsubTyping();
        };
    }, [selectedPatientId]);

    const loadMoreMessages = async () => {
        if (!selectedPatientId || !oldestDoc || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const q = query(
                collection(db, 'promed_passengers', selectedPatientId, 'messages'),
                orderBy('createdAt', 'desc'),
                startAfter(oldestDoc),
                limit(30)
            );

            const snapshot = await getDocs(q);
            const newMsgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse() as Message[];

            if (newMsgs.length > 0) {
                setMessages(prev => [...newMsgs, ...prev]);
                setOldestDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === 30);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Load more failed:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleTyping = () => {
        if (!selectedPatientId) return;

        // Update my status to "typing" for the patient to see
        updateDoc(doc(db, 'patients', selectedPatientId), {
            doctorIsTyping: true
        }).catch(e => console.error("Typing error", e));

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            updateDoc(doc(db, 'patients', selectedPatientId), {
                doctorIsTyping: false
            });
        }, 3000);
    };

    // NEW: Auto-mark as read if chat is open
    useEffect(() => {
        if (selectedPatient && selectedPatient.unreadCount && selectedPatient.unreadCount > 0) {
            updateDoc(doc(db, 'patients', selectedPatient.id), { unreadCount: 0 })
                .catch(err => console.error("Failed to mark as read:", err));
        }
    }, [selectedPatient, selectedPatient?.unreadCount]);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
        }
    };

    useEffect(() => {
        if (!messageInput && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [messageInput]);


    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async () => {
        console.log("🖱️ handleSendMessage clicked!", {
            messageInput,
            uploadedUrl,
            patientId: selectedPatient?.id,
            isSending,
            isImageUploading
        });

        if ((!messageInput.trim() && !uploadedUrl) || !selectedPatient || isSending || isImageUploading) {
            console.log("🛑 Guard triggered: skipping send", {
                noInput: (!messageInput.trim() && !uploadedUrl),
                noPatient: !selectedPatient,
                isSending,
                isImageUploading
            });
            return;
        }

        setIsSending(true);
        try {
            const now = new Date();
            const messageData = {
                text: messageInput.trim(),
                image: uploadedUrl || null,
                sender: 'doctor',
                createdAt: now.toISOString(),
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            // 1. Add to Patient's subcollection (Persistence)
            const docRef = await addDoc(collection(db, 'promed_passengers', selectedPatient.id, 'messages'), messageData);

            // 2. Update 'lastActive', 'unreadCount', and 'lastMessage'
            await updateDoc(doc(db, 'patients', selectedPatient.id), {
                lastMessage: messageInput.trim() || (uploadedUrl ? "🖼 Photo" : ""),
                lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // 3. Add to Outbound Queue (for Bot)
            if (!selectedPatient.telegramChatId) {
                console.warn("⚠️ Cannot send to Telegram: Missing Chat ID");
                showToastError(t('toast_error_title'), "Missing Telegram connection for this patient. Please ask them to start the bot.");
                // We still save to firestore local messages, but don't queue for bot
            } else {
                console.log("📤 Queueing task for Bot:", {
                    chatId: selectedPatient.telegramChatId,
                    text: messageInput.trim(),
                    image: uploadedUrl
                });

                await addDoc(collection(db, 'outbound_tasks'), {
                    telegramChatId: selectedPatient.telegramChatId || null,
                    text: messageInput.trim() || null,
                    imageUrl: uploadedUrl || null,
                    status: 'PENDING',
                    patientId: selectedPatient.id,
                    originalMessageId: docRef.id,
                    patientName: selectedPatient.fullName,
                    botLanguage: selectedPatient.botLanguage || 'uz',
                    action: 'SEND',
                    createdAt: now.toISOString()
                });
                console.log("✅ Task added to outbound_tasks");
            }

            setMessageInput('');
            resetImage();
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset height
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            showToastError(t('toast_error_title'), "Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    const handleVoiceSend = async () => {
        if (!audioBlob || !selectedPatient) return;

        setIsSending(true);
        try {
            const voiceId = `voice_${Date.now()}`;
            const storagePath = `chat_voices/${selectedPatient.id}/${voiceId}.webm`;
            const voiceRef = ref(storage, storagePath);

            // 1. Upload to Storage
            await uploadBytes(voiceRef, audioBlob, { contentType: 'audio/webm' });
            const voiceUrl = await getDownloadURL(voiceRef);

            const now = new Date();

            // 2. Local Firestore (Dashboard)
            const docRef = await addDoc(collection(db, 'promed_passengers', selectedPatient.id, 'messages'), {
                text: null,
                sender: 'doctor',
                voice: voiceUrl,
                createdAt: now.toISOString(),
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // 3. Update Patient Master Doc
            await updateDoc(doc(db, 'patients', selectedPatient.id), {
                lastMessage: "🎤 Voice Message",
                lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // 4. Queue for Bot
            if (!selectedPatient.telegramChatId) {
                showToastError(t('toast_error_title'), "Missing Telegram connection for this patient.");
            } else {
                await addDoc(collection(db, 'outbound_tasks'), {
                    telegramChatId: selectedPatient.telegramChatId,
                    text: null,
                    voiceUrl: voiceUrl,
                    status: 'PENDING',
                    patientId: selectedPatient.id,
                    originalMessageId: docRef.id,
                    patientName: selectedPatient.fullName,
                    botLanguage: selectedPatient.botLanguage || 'uz',
                    action: 'SEND',
                    createdAt: now.toISOString()
                });
            }

            resetRecorder();
            showToastSuccess(t('toast_success_title'), "Voice message sent successfully.");
        } catch (error) {
            console.error("Failed to send voice message:", error);
            showToastError(t('toast_error_title'), "Failed to send voice message.");
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleUpdateMessage = async (messageId: string) => {
        if (!selectedPatientId || !editContent.trim()) return;

        const messageToUpdate = messages.find(m => m.id === messageId);
        if (!messageToUpdate) return;

        try {
            // 1. Update Firestore
            await updateDoc(doc(db, 'promed_passengers', selectedPatientId, 'messages', messageId), {
                text: editContent
            });

            console.log("🛠 Debug Edit: Msg ID:", messageId);
            console.log("🛠 Debug Edit: Msg Object:", messageToUpdate);
            console.log("🛠 Debug Edit: Patient Chat ID:", selectedPatient?.telegramChatId);

            // 2. Sync with Telegram Bot
            if (messageToUpdate.telegramMessageId && selectedPatient?.telegramChatId) {
                console.log("✅ Condition Met! Sending EDIT action to bot...");
                await addDoc(collection(db, 'outbound_tasks'), {
                    telegramChatId: selectedPatient.telegramChatId,
                    telegramMessageId: messageToUpdate.telegramMessageId,
                    text: editContent,
                    action: 'EDIT',
                    status: 'PENDING',
                    patientName: selectedPatient.fullName,
                    createdAt: new Date().toISOString()
                });
            }

            setEditingMessageId(null);
            setEditContent('');
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };

    const confirmDeleteMessage = async () => {
        if (!selectedPatientId || !messageToDelete) return;

        try {
            // 1. Delete from Firestore
            await deleteDoc(doc(db, 'promed_passengers', selectedPatientId, 'messages', messageToDelete.id));

            // 2. If it has a Telegram ID, trigger bot deletion
            if (messageToDelete.telegramMessageId && selectedPatient?.telegramChatId) {
                await addDoc(collection(db, 'outbound_tasks'), {
                    telegramChatId: selectedPatient.telegramChatId,
                    telegramMessageId: messageToDelete.telegramMessageId,
                    action: 'DELETE',
                    status: 'PENDING',
                    patientName: selectedPatient.fullName,
                    createdAt: new Date().toISOString()
                });
            }

            setIsDeleteModalOpen(false);
            setMessageToDelete(null);

        } catch (error) {
            console.error('Error deleting message:', error);
            alert("Failed to delete");
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-full md:w-96 border-r border-slate-100 flex flex-col bg-white">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-bold text-2xl text-slate-800 mb-4 tracking-tight">{t('messages')}</h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder={t('search')}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-promed-primary/20 focus:border-promed-primary transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={async () => {
                                setSelectedPatientId(patient.id);
                                if (patient.unreadCount && patient.unreadCount > 0) {
                                    // Reset unread count
                                    try {
                                        await updateDoc(doc(db, 'patients', patient.id), { unreadCount: 0 });
                                    } catch (e) {
                                        console.error("Failed to reset unread count", e);
                                    }
                                }
                            }}
                            className={`p-3 rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-200 ${selectedPatientId === patient.id
                                ? 'bg-blue-50/80 border border-blue-100 shadow-sm'
                                : 'hover:bg-slate-50 border border-transparent'
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <ProfileAvatar src={patient.profileImage} alt={patient.fullName} size={48} className="rounded-full ring-2 ring-white shadow-sm" optimisticId={patient.id} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                        <h4 className={`font-bold text-sm truncate ${selectedPatientId === patient.id ? 'text-blue-900' : 'text-slate-800'} flex items-center gap-1.5`}>
                                            <span className="truncate">{patient.fullName}</span>
                                            {patient.tier === 'pro' && <span className="flex-shrink-0"><ProBadge size={16} /></span>}
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{patient.lastMessageTime || ''}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate max-w-[180px] ${selectedPatientId === patient.id ? 'text-blue-600/70' : 'text-slate-500'}`}>
                                        {patient.lastMessage || t('no_messages_yet')}
                                    </p>
                                    {patient.unreadCount && patient.unreadCount > 0 ? (
                                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-promed-primary text-white text-[10px] font-bold rounded-full shadow-sm ml-2">
                                            {patient.unreadCount}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredPatients.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No patients found
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#F8FAFC]">
                {selectedPatient ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <ProfileAvatar src={selectedPatient.profileImage} alt={selectedPatient.fullName} size={44} className="rounded-full shadow-sm" />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        {selectedPatient.fullName}
                                        {selectedPatient.tier === 'pro' && <ProBadge size={22} />}
                                    </h3>
                                    {patientIsTyping && (
                                        <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium animate-pulse">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                            </span>
                                            yozmoqda...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {hasMore && (
                                <div className="flex justify-center pb-4">
                                    <button
                                        onClick={loadMoreMessages}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-500 transition-colors bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm"
                                    >
                                        {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                                        {loadingMore ? t('loading') : t('load_more') || "Load previous messages"}
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-center my-6">
                                <span className="text-xs font-medium text-slate-400 bg-slate-100/80 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                                    {t('label_today')}
                                </span>
                            </div>

                            {messages.length === 0 && (
                                <div className="text-center text-slate-400 text-sm mt-10">
                                    {t('no_messages_yet')}
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'} group relative`}>

                                    <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed relative group/bubble ${msg.sender === 'doctor'
                                        ? 'bg-[#4F46E5] text-white rounded-tr-sm' // promed-primary color
                                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                        } ${editingMessageId === msg.id ? 'w-full min-w-[300px]' : ''}`}>

                                        {/* Actions (Only for doctor) - Floating next to bubble */}
                                        {msg.sender === 'doctor' && editingMessageId !== msg.id && (
                                            <div className="opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 absolute top-0 right-full mr-3 flex flex-col gap-1 z-10">
                                                <div className="bg-white shadow-soft-xl rounded-xl p-1 flex flex-col gap-1 items-center w-8">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingMessageId(msg.id);
                                                            setEditContent(msg.text);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                                                        title={t('edit') || "Edit"}
                                                    >
                                                        <Edit2 size={15} strokeWidth={2} />
                                                    </button>
                                                    <div className="w-4 h-[1px] bg-slate-100" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMessageToDelete(msg);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                        title={t('delete') || "Delete"}
                                                    >
                                                        <Trash2 size={15} strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}


                                        {editingMessageId === msg.id ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-white/40"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingMessageId(null)} className="p-1 hover:bg-white/10 rounded">
                                                        <X size={14} />
                                                    </button>
                                                    <button onClick={() => handleUpdateMessage(msg.id)} className="p-1 hover:bg-white/10 rounded text-green-300">
                                                        <Check size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {msg.image && (
                                                    <img src={msg.image} alt="attachment" className="rounded-lg max-h-64 w-full object-cover mb-2" />
                                                )}
                                                {msg.voice && (
                                                    <div className={`p-1 rounded-xl mb-2 ${msg.sender === 'doctor' ? 'bg-white/20' : 'bg-slate-50'}`}>
                                                        <audio src={msg.voice} controls className="h-8 w-56 custom-audio" />
                                                        <style dangerouslySetInnerHTML={{
                                                            __html: `
                                                            .custom-audio::-webkit-media-controls-enclosure {
                                                                background-color: transparent;
                                                            }
                                                            .custom-audio::-webkit-media-controls-panel {
                                                                background-color: transparent;
                                                                ${msg.sender === 'doctor' ? 'filter: invert(1);' : ''}
                                                            }
                                                        `}} />
                                                    </div>
                                                )}
                                                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                                <div className={`text-[10px] mt-1.5 flex items-center gap-1 opacity-80 ${msg.sender === 'doctor' ? 'justify-end text-blue-100' : 'justify-end text-slate-400'
                                                    }`}>
                                                    {msg.time}
                                                    {msg.sender === 'doctor' && (
                                                        <span className="text-[10px] select-none">
                                                            {(msg.status === 'seen' || msg.status === 'delivered') ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 relative">
                            {/* Emoji Picker Popover */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-24 left-4 z-50 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="relative">
                                        <EmojiPicker
                                            emojiStyle={EmojiStyle.APPLE}
                                            onEmojiClick={(emojiData) => {
                                                setMessageInput(prev => prev + emojiData.emoji);
                                            }}
                                            theme={Theme.LIGHT}
                                            lazyLoadEmojis={true}
                                            searchDisabled={false}
                                            width={350}
                                            height={450}
                                            previewConfig={{ showPreview: false }}
                                        />
                                        {/* Arrow Down */}
                                        <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-200"></div>
                                    </div>
                                    {/* Backdrop to close */}
                                    <div
                                        className="fixed inset-0 z-[-1]"
                                        onClick={() => setShowEmojiPicker(false)}
                                    />
                                </div>
                            )}

                            {/* Image Preview Overlay */}
                            {previewUrl && (
                                <div className="absolute bottom-full left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-300 z-20">
                                    <div className="relative inline-block group">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="h-32 w-auto rounded-xl shadow-lg border-2 border-white object-cover"
                                        />
                                        <button
                                            onClick={resetImage}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                        {isImageUploading && (
                                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                                <div className="text-white text-[10px] font-bold">{progress}%</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-end gap-1 bg-[#17212B] p-1 rounded-xl border border-white/5 transition-all shadow-2xl">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    className="hidden"
                                />

                                {/* 1. Paperclip (Left) */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-[#708499] hover:text-[#6AB2F2] transition-colors flex-shrink-0"
                                    disabled={isSending || isImageUploading}
                                >
                                    <Paperclip size={24} className={previewUrl ? 'text-[#6AB2F2]' : ''} />
                                </button>

                                {/* 2. Input (Middle) */}
                                <textarea
                                    ref={textareaRef}
                                    value={messageInput}
                                    onChange={(e) => {
                                        setMessageInput(e.target.value);
                                        adjustTextareaHeight();
                                        handleTyping();
                                    }}
                                    placeholder={t('placeholder_type_message') || "Write a message..."}
                                    disabled={isSending || isImageUploading}
                                    className="flex-1 bg-transparent border-none focus:outline-none px-2 py-3 text-[15px] resize-none max-h-48 min-h-[44px] overflow-y-auto w-full placeholder:text-[#708499] text-white disabled:opacity-50"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />

                                {/* 3. Emoji (Right) */}
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-3 transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-[#6AB2F2]' : 'text-[#708499] hover:text-[#6AB2F2]'}`}
                                    disabled={isSending || isImageUploading}
                                >
                                    <Smile size={24} />
                                </button>

                                {/* 4. Send/Mic (Far Right) */}
                                {isRecording ? (
                                    <div className="flex items-center gap-2 px-2 animate-pulse bg-red-500/10 rounded-full mr-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-red-500 font-mono text-xs">{formatTime(recordingTime)}</span>
                                        <button
                                            onClick={stopRecording}
                                            className="p-2 text-red-500 hover:scale-110 transition-transform"
                                        >
                                            <Square size={20} fill="currentColor" />
                                        </button>
                                    </div>
                                ) : audioBlob ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={resetRecorder}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <button
                                            onClick={handleVoiceSend}
                                            disabled={isSending}
                                            className="p-3 text-[#6AB2F2] hover:scale-110 transition-all"
                                        >
                                            <Send size={24} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSendMessage}
                                        onMouseDown={(e) => {
                                            if (!messageInput.trim() && !uploadedUrl) {
                                                e.preventDefault();
                                                startRecording();
                                            }
                                        }}
                                        disabled={isSending || isImageUploading}
                                        className={`p-3 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${(!messageInput.trim() && !uploadedUrl) ? 'text-[#708499]' : 'text-[#6AB2F2] hover:scale-110 active:scale-90'}`}
                                    >
                                        {isSending || isImageUploading ? (
                                            <div className="w-5 h-5 border-2 border-[#708499] border-t-[#6AB2F2] rounded-full animate-spin" />
                                        ) : (
                                            (messageInput.trim() || uploadedUrl) ? <Send size={24} /> : <Mic size={24} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <User size={48} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">{t('patient_list')}</h3>
                    </div>
                )}
            </div>
            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setMessageToDelete(null);
                }}
                onConfirm={confirmDeleteMessage}
            />
        </div>
    );
};
