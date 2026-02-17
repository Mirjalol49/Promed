
import React, { useState, useEffect, useRef, useMemo } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient } from '../../types';
import { Search, Send, User, Smile, Trash2, Edit2, X, Check, CheckCheck, ChevronDown, Copy, Reply, Pin, PinOff, CalendarClock, Clock, BellOff } from 'lucide-react';
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { uz, ru, enGB } from 'date-fns/locale';

import { useToast } from '../../contexts/ToastContext';
import DeleteModal from '../../components/ui/DeleteModal';
import { ScheduleModal } from '../../components/ui/ScheduleModal'; // NEW
import { ProBadge } from '../../components/ui/ProBadge';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, limitToLast, startAfter, endBefore, limit, getDocs, where, writeBatch, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

import { Play, Pause, Loader2 } from 'lucide-react';
import { ButtonLoader } from '../../components/ui/LoadingSpinner';
import Lottie from 'lottie-react';
import chatAnimation from '../../assets/images/mascots/chat.json';

interface MessagesPageProps {
    patients?: Patient[];
    isVisible?: boolean; // NEW
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
    status?: 'sent' | 'delivered' | 'seen' | 'scheduled'; // Updated status
    scheduledFor?: string; // New field
    seen?: boolean;
    isPinned?: boolean;
    replyTo?: {
        id: string;
        text: string;
        sender: string;
        displayName: string;
    };
    preview?: {
        title: string;
        description: string;
        image: string;
        url: string;
    };
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ patients = [], isVisible = true }) => {
    const { t, language } = useLanguage();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchText, setSearchText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isScheduledView, setIsScheduledView] = useState(false);

    // Schedule Modal State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [sendButtonContextMenu, setSendButtonContextMenu] = useState<{ x: number, y: number } | null>(null);
    const sendButtonRef = useRef<HTMLButtonElement>(null);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

    // Context Menu State (Right-Click)
    const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);

    // Optimization State
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [oldestDoc, setOldestDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [patientIsTyping, setPatientIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // messagesEndRef handled in scrolling logic
    const { error: showToastError, success: showToastSuccess } = useToast();


    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    // Get Pinned Messages (Multiple support)
    const pinnedMessages = messages.filter(m => m.isPinned).reverse(); // Oldest first? Or Newest? Telegram usually cycles. Let's do Standard order (Newest at bottom of list, so maybe reverse to cycle up? or down?)
    // Actually, typical cycle is: You are at bottom. You click pin. It jumps to the *latest* pinned message (nearest to bottom). Click again -> jumps to *previous* pinned message (further up).
    // So let's sort them by time descending (Newest first).
    // messages is likely newest first or oldest first? 
    // In the code: `setMessages(msgs)` where `msgs` are reversed from snapshot (snapshot is desc). So `messages` state is Oldest -> Newest (Standard chat log).
    // So pinnedMessages should be filtered from `messages` (Oldest -> Newest).
    // We want to jump to the one *closest* to current view? Or simply cycle?
    // Cycle: Latest -> Older -> Older -> Back to Latest.
    // So let's reverse `messages.filter(...)` so we get Newest -> Oldest.

    const allPinned = useMemo(() => messages.filter(m => m.isPinned).reverse(), [messages]);
    const [activePinIndex, setActivePinIndex] = useState(0);

    // Reset index if pins change count (or just clamp it)
    useEffect(() => {
        if (activePinIndex >= allPinned.length) setActivePinIndex(0);
    }, [allPinned.length]);

    const currentPinned = allPinned[activePinIndex];

    // Close context menu on click outside
    useEffect(() => {
        if (!contextMenuMessageId) return;

        // Use timeout to prevent the opening right-click from immediately closing the menu
        const timer = setTimeout(() => {
            const handleClickOutside = () => setContextMenuMessageId(null);
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('contextmenu', handleClickOutside);

            // Store cleanup in ref pattern
            (window as any).__menuCleanup = () => {
                document.removeEventListener('click', handleClickOutside);
                document.removeEventListener('contextmenu', handleClickOutside);
            };
        }, 10);

        return () => {
            clearTimeout(timer);
            (window as any).__menuCleanup?.();
        };
    }, [contextMenuMessageId]);


    // Filter patients
    const filteredPatients = patients.filter(p =>
        p.fullName.toLowerCase().includes(searchText.toLowerCase())
    );

    // Simple scroll memory - save position on every scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContentRef = useRef<HTMLDivElement>(null);
    const scrollMemory = useRef<Map<string, number>>(new Map());
    const justSwitchedRef = useRef(false);
    const isUserSendingMessage = useRef(false); // Track user sending action

    // Moved scroll listener to onScroll prop for better React lifecycle integration
    const handleScroll = () => {
        if (justSwitchedRef.current) return; // 🛡️ Prevent saving 0 during view transition/render

        const container = messagesContentRef.current;
        if (!container || !selectedPatientId) return;

        const pos = container.scrollTop;
        const key = `${selectedPatientId}_${isScheduledView ? 'sched' : 'chat'}`;
        scrollMemory.current.set(key, pos);
    };

    // Mark that we just switched patients OR views
    useEffect(() => {
        justSwitchedRef.current = true;
        setReplyingToMessage(null);
    }, [selectedPatientId, isScheduledView]);


    // Restore scroll after messages load or view switch
    // Restore scroll after messages load or view switch
    useEffect(() => {
        if (!selectedPatientId || !messagesContentRef.current) return;

        // Wait for messages to populate before restoring scroll (unless it's truly empty, handled below)
        if (messages.length === 0 && !isScheduledView) return;

        // If we just switched patients/views, attempt to restore position
        if (justSwitchedRef.current) {
            const key = `${selectedPatientId}_${isScheduledView ? 'sched' : 'chat'}`;
            const savedPos = scrollMemory.current.get(key);

            console.log(`📌 View switch (${isScheduledView ? 'Sched' : 'Chat'}) - saved position for ${selectedPatientId}:`, savedPos);

            if (savedPos !== undefined) {
                // Restore saved position
                if (messagesContentRef.current) {
                    messagesContentRef.current.scrollTop = savedPos;
                    // Double check in next frame ensures layout is stable
                    requestAnimationFrame(() => {
                        if (messagesContentRef.current) messagesContentRef.current.scrollTop = savedPos;
                        justSwitchedRef.current = false;
                    });
                }
            } else {
                // First time visiting: Scroll to bottom for Chat, Top for Scheduled
                if (!isScheduledView) {
                    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
                    justSwitchedRef.current = false;
                } else {
                    if (messagesContentRef.current) messagesContentRef.current.scrollTop = 0;
                    justSwitchedRef.current = false;
                }
            }
        }
        // If NOT switching views, check if we should auto-scroll due to USER sending a message
        else if (isUserSendingMessage.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender === 'doctor' && !isScheduledView) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                isUserSendingMessage.current = false; // Reset flag
            }
        }
    }, [messages, selectedPatientId, isScheduledView]);

    // Fetch Messages (with Pagination & Local Cache)
    useEffect(() => {
        if (!selectedPatientId) {
            setMessages([]);
            return;
        }

        // 1. Try Local Cache
        const cached = localStorage.getItem(`msgs_${selectedPatientId} `);
        if (cached) {
            try {
                setMessages(JSON.parse(cached));
            } catch (e) { console.error("Cache parse error", e); }
        }

        // 2. Initial Realtime Listener (Limit to 30)
        const q = query(
            collection(db, 'patients', selectedPatientId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse() as Message[];

            setMessages(msgs);
            localStorage.setItem(`msgs_${selectedPatientId} `, JSON.stringify(msgs));

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


    // Safety clear for typing status (backend might get stuck)
    useEffect(() => {
        if (patientIsTyping) {
            const timer = setTimeout(() => setPatientIsTyping(false), 8000);
            return () => clearTimeout(timer);
        }
    }, [patientIsTyping]);

    const loadMoreMessages = async () => {
        if (!selectedPatientId || !oldestDoc || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const q = query(
                collection(db, 'patients', selectedPatientId, 'messages'),
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

    // NEW: Manual Mark as Read Handler
    const handleMarkAsRead = async () => {
        if (!selectedPatientId || !selectedPatient) return;
        if (selectedPatient.unreadCount && selectedPatient.unreadCount > 0) {
            console.log("👀 Marking as read manually (Interaction detected)");
            try {
                await updateDoc(doc(db, 'patients', selectedPatientId), { unreadCount: 0 });
            } catch (err) {
                console.error("Failed to mark as read:", err);
            }
        }
    };

    // REMOVED: Auto-mark as read useEffect


    // NEW: Mark messages as SEEN in Firestore (Batched) - Only when page is visible
    // NEW: Mark messages as SEEN in Firestore (Batched) - Only when page is visible
    useEffect(() => {
        if (!selectedPatientId || messages.length === 0) return;

        // Check if page is visible (user is actually viewing it)
        if (document.hidden || !isVisible) { // ✅ Check app-level visibility
            console.log('📱 Page is hidden (or view inactive), not marking messages as seen');
            return;
        }

        const unseenMessages = messages.filter(m => m.sender === 'user' && m.seen === false);

        if (unseenMessages.length > 0) {
            console.log(`✅ Marking ${unseenMessages.length} messages as seen`);
            const batch = writeBatch(db);
            unseenMessages.forEach(msg => {
                const msgRef = doc(db, 'patients', selectedPatientId, 'messages', msg.id);
                batch.update(msgRef, { seen: true });
            });

            batch.commit().catch(e => console.error("Error marking seen", e));
        }

        // Removed conflicting auto-scroll logic here. Now handled in the main restoration useEffect using isUserSendingMessage ref.

    }, [messages, selectedPatientId, isVisible]);

    // NEW: Self-heal inconsistent sidebar times (Backfill lastMessageTimestamp)
    useEffect(() => {
        if (!selectedPatientId || messages.length === 0 || !selectedPatient) return;

        const latestMsg = messages[messages.length - 1]; // Messages are filtered/sorted? 
        // messages state is set as reverse() from snapshot (snapshot is desc). So messages[0] is Oldest? 
        // Let's re-verify line 172: setMessages(msgs); where msgs = snapshot.docs...reverse().
        // Snapshot is orderBy('createdAt', 'desc'). So docs[0] is Newest.
        // reverse() makes msgs[0] Oldest. 
        // So latest message is messages[messages.length - 1].

        const latestTimestamp = latestMsg.createdAt;

        // If patient is missing timestamp OR the stored formatted time doesn't match our preferred 24h format
        // actually, just checking if timestamp is missing is safest/cheapest.
        // Or if we really want to force update the string to 24h too.
        if (!selectedPatient.lastMessageTimestamp) {
            console.log("🩹 Self-healing patient timestamp...");
            updateDoc(doc(db, 'patients', selectedPatientId), {
                lastMessageTimestamp: latestTimestamp,
                lastMessageTime: new Date(latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            }).catch(e => console.error("Heal failed", e));
        }
    }, [messages, selectedPatient, selectedPatientId]);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight} px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [messageInput]);


    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async (scheduledDateArg?: Date) => {
        if (!messageInput.trim() || !selectedPatient || isSending) {
            return;
        }

        if (editingMessageId) {
            await handleUpdateMessage(editingMessageId);
            return;
        }

        setIsSending(true);
        isUserSendingMessage.current = true; // Set flag to trigger auto-scroll on update
        try {
            const now = new Date();
            const messageData: any = {
                text: messageInput.trim(),
                sender: 'doctor',
                createdAt: now.toISOString(),
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            };

            // Handle Scheduling (Local Display)
            if (scheduledDateArg) {
                console.log("🚀 [FRONTEND] Sending Scheduled Message:", scheduledDateArg.toISOString());
                messageData.status = 'scheduled';
                messageData.scheduledFor = scheduledDateArg.toISOString();
            }

            // Add Reply Data
            if (replyingToMessage) {
                messageData.replyTo = {
                    id: replyingToMessage.id,
                    text: replyingToMessage.text,
                    sender: replyingToMessage.sender,
                    displayName: replyingToMessage.sender === 'doctor' ? 'Doctor' : selectedPatient.fullName
                };
            }

            // 1. Add to Patient's subcollection (Persistence)
            const docRef = await addDoc(collection(db, 'patients', selectedPatient.id, 'messages'), messageData);

            // 2. Update 'lastActive', 'unreadCount', and 'lastMessage'
            // Only update lastMessage if NOT scheduled (or maybe denote it?)
            if (!scheduledDateArg) {
                await updateDoc(doc(db, 'patients', selectedPatient.id), {
                    lastMessage: messageInput.trim(),
                    lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    lastMessageTimestamp: now.toISOString()
                });
            }

            // 3. Add to Outbound Queue (for Bot)
            if (!selectedPatient.telegramChatId) {
                console.warn("⚠️ Cannot send to Telegram: Missing Chat ID");
                showToastError(t('toast_error_title'), "Missing Telegram connection for this patient. Please ask them to start the bot.");
            } else {
                const payload: any = {
                    telegramChatId: selectedPatient.telegramChatId || null,
                    text: messageInput.trim() || null,
                    status: scheduledDateArg ? 'QUEUED' : 'PENDING', // Direct QUEUED for scheduled
                    patientId: selectedPatient.id,
                    originalMessageId: docRef.id,
                    patientName: selectedPatient.fullName,
                    botLanguage: selectedPatient.botLanguage || 'uz',
                    action: 'SEND',
                    createdAt: now.toISOString()
                };

                // Handle Scheduling (Bot Payload)
                if (scheduledDateArg) {
                    console.log("🕒 Adding scheduledFor to payload:", scheduledDateArg.toISOString());
                    payload.scheduledFor = scheduledDateArg.toISOString();
                } else {
                    console.log("⚠️ No scheduledDateArg provided. Message will send immediately.");
                }

                // Forward reply info to bot if it has a telegram ID to reply to
                if (replyingToMessage && replyingToMessage.telegramMessageId) {
                    payload.replyToMessageId = replyingToMessage.telegramMessageId;
                }

                console.log("📤 Queueing task for Bot:", payload);

                await addDoc(collection(db, 'outbound_messages'), payload);
                console.log("✅ Task added to outbound_messages");
            }

            setMessageInput('');
            setReplyingToMessage(null); // Clear reply
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset height
            }

            // If scheduled, show success toast? (REMOVED per request)
            // if (scheduledDateArg) {
            //    showToastSuccess(t('success'), `Message scheduled for ${scheduledDateArg.toLocaleString()}`);
            // }

        } catch (error) {
            console.error("Failed to send message:", error);
            showToastError(t('toast_error_title'), "Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };


    const handleTogglePin = async (msg: Message) => {
        if (!selectedPatientId) return;

        console.log('🔵 Pin toggle clicked:', { messageId: msg.id, currentState: msg.isPinned });

        try {
            const newPinnedState = !msg.isPinned;

            console.log('🔵 Updating to:', newPinnedState);

            // If pinning this one, unpin others? Telegram allows multiple pins, but simpler to show one in header for now. 
            // Let's toggle just this one. The header will pick the latest pinned.
            await updateDoc(doc(db, 'patients', selectedPatientId, 'messages', msg.id), {
                isPinned: newPinnedState
            });

            console.log('✅ Pin state updated successfully');

            // Verify with Toast (REMOVED per user request)
            // if(newPinnedState) showToastSuccess("Pinned", "Message pinned to top");
            // else showToastSuccess("Unpinned", "Message unpinned");

        } catch (e) {
            console.error("❌ Pin error:", e);
        }
    };


    const handleUpdateMessage = async (messageId: string) => {
        if (!selectedPatientId || !messageInput.trim()) return;

        const messageToUpdate = messages.find(m => m.id === messageId);
        if (!messageToUpdate) return;

        try {
            // 1. Update Firestore
            await updateDoc(doc(db, 'patients', selectedPatientId, 'messages', messageId), {
                text: messageInput.trim()
            });

            console.log("🛠 Debug Edit: Msg ID:", messageId);

            // 2. Sync with Telegram Bot
            if (messageToUpdate.telegramMessageId && selectedPatient?.telegramChatId) {
                console.log("✅ Condition Met! Sending EDIT action to bot...");
                await addDoc(collection(db, 'outbound_messages'), {
                    telegramChatId: selectedPatient.telegramChatId,
                    telegramMessageId: messageToUpdate.telegramMessageId,
                    text: messageInput.trim(),
                    action: 'EDIT',
                    status: 'PENDING',
                    patientName: selectedPatient.fullName,
                    createdAt: new Date().toISOString()
                });
            }

            setEditingMessageId(null);
            setMessageInput('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };

    const confirmDeleteMessage = async () => {
        if (!selectedPatientId || !messageToDelete) return;

        try {
            // 1. Delete from Firestore messages subcollection
            await deleteDoc(doc(db, 'patients', selectedPatientId, 'messages', messageToDelete.id));

            // 2. If it's a scheduled message, also delete from outbound_messages queue
            if (messageToDelete.status === 'scheduled' && messageToDelete.scheduledFor && selectedPatient?.telegramChatId) {
                // Query for matching queued message in outbound_messages
                const outboundQuery = query(
                    collection(db, 'outbound_messages'),
                    where('telegramChatId', '==', selectedPatient.telegramChatId),
                    where('status', '==', 'QUEUED'),
                    where('scheduledFor', '==', messageToDelete.scheduledFor),
                    where('text', '==', messageToDelete.text)
                );

                const outboundSnapshot = await getDocs(outboundQuery);

                // Delete all matching queued messages
                const deleteBatch = writeBatch(db);
                outboundSnapshot.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });
                await deleteBatch.commit();

                console.log(`🗑️ Deleted ${outboundSnapshot.size} queued message(s) from outbound_messages`);
            }

            // 3. If it has a Telegram ID (already sent), trigger bot deletion
            if (messageToDelete.telegramMessageId && selectedPatient?.telegramChatId) {
                await addDoc(collection(db, 'outbound_messages'), {
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

    // Filter Scheduled vs Normal Messages
    const displayedMessages = useMemo(() => {
        if (isScheduledView) {
            return messages
                .filter(m => m.status === 'scheduled')
                .sort((a, b) => {
                    const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
                    const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
                    return dateA - dateB;
                });
        }
        return messages.filter(m => m.status !== 'scheduled');
    }, [messages, isScheduledView]);

    const formatDateHeader = (dateStr: string, includeTime: boolean = false) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let datePart = "";
        const localeObj = language === 'uz' ? uz : language === 'ru' ? ru : enGB;

        if (date.toDateString() === today.toDateString()) {
            datePart = t('label_today') || t('today');
        } else if (date.toDateString() === tomorrow.toDateString()) {
            datePart = t('tomorrow');
        } else {
            // Fix: Use date-fns for consistent cross-browser formatting
            datePart = format(date, 'd MMMM', { locale: localeObj });
        }

        if (includeTime) {
            const timePart = format(date, 'HH:mm', { locale: localeObj });
            return `${datePart}, ${timePart}`;
        }
        return datePart;
    };

    return (
        <div className="flex h-[calc(100dvh-80px)] md:h-[calc(100vh-120px)] bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-300 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className={`w-full md:w-96 border-r border-slate-300 flex-col bg-white ${selectedPatientId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 md:p-5 border-b border-slate-300">
                    <h2 className="font-bold text-xl md:text-2xl text-slate-800 mb-3 md:mb-4 tracking-tight">{t('messages')}</h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder={t('search')}
                            className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-promed-primary/40 focus:border-promed-primary transition-all placeholder:text-slate-400 font-medium text-slate-700 shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={async () => {
                                setSelectedPatientId(patient.id);
                            }}
                            className={`p-3 rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-300 ${selectedPatientId === patient.id
                                ? 'gel-blue-style shadow-xl scale-[1.02] !border-none'
                                : 'hover:bg-slate-100'
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <ProfileAvatar src={patient.profileImage} alt={patient.fullName} size={48} className="rounded-full ring-2 ring-white shadow-sm" optimisticId={patient.id} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                        <h4 className={`font-bold text-sm truncate ${selectedPatientId === patient.id ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
                                            <span className="truncate">{patient.fullName}</span>
                                            {patient.tier === 'pro' && <span className="flex-shrink-0"><ProBadge size={16} className={selectedPatientId === patient.id ? 'text-white' : ''} /></span>}
                                        </h4>
                                    </div>
                                    <span className={`text-[10px] font-medium whitespace-nowrap ml-2 ${selectedPatientId === patient.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {patient.lastMessageTimestamp
                                            ? new Date(patient.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                            : patient.lastMessageTime || ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate max-w-[180px] ${selectedPatientId === patient.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {patient.lastMessage || t('no_messages_yet')}
                                    </p>
                                    {patient.unreadCount && patient.unreadCount > 0 ? (
                                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full shadow-sm ml-2 ${selectedPatientId === patient.id ? 'bg-white text-promed-primary' : 'bg-promed-primary text-white'}`}>
                                            {patient.unreadCount}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredPatients.length === 0 && (
                        <div className="py-8">
                            <EmptyState
                                message={t('no_patients_found') || "No patients found"}
                                fullHeight={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div
                className={`flex-1 flex-col bg-[#F8FAFC] ${selectedPatientId ? 'flex' : 'hidden md:flex'}`}
                onClickCapture={handleMarkAsRead} // Capture phase to ensure it runs before other handlers if needed, or bubble is fine. Let's use standard onClick or onClickCapture. onClick is safer.
            >
                {selectedPatient ? (
                    <>
                        {/* Header */}
                        <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-b border-slate-300 shadow-md z-20 sticky top-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                                    <button
                                        onClick={() => setSelectedPatientId(null)}
                                        className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <ChevronDown className="rotate-90" size={22} />
                                    </button>
                                    <ProfileAvatar src={selectedPatient.profileImage} alt={selectedPatient.fullName} size={40} className="rounded-full shadow-sm flex-shrink-0 md:!w-11 md:!h-11" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-1.5 truncate">
                                            <span className="truncate">{selectedPatient.fullName}</span>
                                            {selectedPatient.tier === 'pro' && <ProBadge size={18} />}
                                        </h3>
                                        {patientIsTyping && !isScheduledView && (
                                            <div className="flex items-center gap-1.5 text-promed-primary text-xs font-black animate-pulse">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-promed-primary/40 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-promed-primary"></span>
                                                </span>
                                                yozmoqda...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex bg-slate-200 p-0.5 md:p-1 rounded-lg border border-slate-300 flex-shrink-0">
                                    <button
                                        onClick={() => setIsScheduledView(false)}
                                        className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black rounded-md transition-all ${!isScheduledView ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        {t('tab_chat')}
                                    </button>
                                    <button
                                        onClick={() => setIsScheduledView(true)}
                                        className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black rounded-md transition-all ${isScheduledView ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        <CalendarClock size={12} className="hidden sm:block md:w-[14px] md:h-[14px]" />
                                        <span className="hidden sm:inline">{t('tab_scheduled')}</span>
                                        <CalendarClock size={14} className="sm:hidden" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pinned Message Header - Only show in Chat view */}
                        {currentPinned && !isScheduledView && (
                            <div
                                onClick={() => {
                                    // 1. Scroll to current
                                    const el = document.getElementById(`msg-${currentPinned.id}`);
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                        // Highlight effect
                                        el.classList.add('bg-blue-100/50');
                                        setTimeout(() => el.classList.remove('bg-blue-100/50'), 1000);
                                    } else {
                                        // If not loaded (pagination), maybe show toast? Or just load?
                                        // For now, assume loaded.
                                        showToastSuccess(t('info'), "Message is further up in history.");
                                    }

                                    // 2. Cycle to next
                                    if (allPinned.length > 1) {
                                        let nextIndex = activePinIndex + 1;
                                        if (nextIndex >= allPinned.length) nextIndex = 0;
                                        setActivePinIndex(nextIndex);
                                    }
                                }}
                                className="px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors z-10 animate-fade-in"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Sidebar Indicator (Telegram Style: Stacked lines if multiple) */}
                                    <div className="flex flex-col gap-[2px]">
                                        <div className="h-8 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                        {/* Optional: Add visual hint for multiple pins? */}
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <span className="text-blue-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                            <Pin size={12} className="fill-blue-500" />
                                            {t('pinned_message')}  {allPinned.length > 1 && <span className="text-[10px] opacity-70 ml-1">{activePinIndex + 1} / {allPinned.length}</span>}
                                        </span>
                                        <span className="text-slate-600 text-xs truncate max-w-[200px] md:max-w-md">
                                            {currentPinned.text}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Unpin Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePin(currentPinned);
                                        }}
                                        className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                                        title="Unpin"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Messages List - Telegram Style */}
                        <div className="flex-1 relative bg-slate-300">
                            <div
                                ref={messagesContentRef}
                                onScroll={(e) => {
                                    handleScroll();

                                    // Scroll Button Visibility Logic
                                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
                                    setShowScrollButton(!isNearBottom);
                                }}
                                className="absolute inset-0 overflow-y-auto px-2 md:px-4 pt-3 md:pt-4 pb-1 space-y-2 md:space-y-3 no-scrollbar"
                            >
                                {hasMore && !loadingMore && !isScheduledView && (
                                    <div className="flex justify-center pb-4">
                                        <button
                                            onClick={loadMoreMessages}
                                            className="text-xs text-slate-500 bg-white/60 hover:bg-white px-3 py-1 rounded-full shadow-sm transition-colors"
                                        >
                                            {t('load_more') || "Load previous messages"}
                                        </button>
                                    </div>
                                )}
                                {loadingMore && (
                                    <div className="flex justify-center pb-4">
                                        <Loader2 size={16} className="animate-spin text-slate-500" />
                                    </div>
                                )}

                                {displayedMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                        <div className="mb-4 p-6 rounded-full bg-white shadow-sm">
                                            {isScheduledView ? (
                                                <CalendarClock size={48} className="text-slate-800" />
                                            ) : (
                                                <User size={48} className="text-slate-800" />
                                            )}
                                        </div>
                                        <p className="text-slate-800 text-base font-medium mb-2">
                                            {isScheduledView ? t('no_scheduled_messages') : t('no_messages_yet')}
                                        </p>
                                    </div>
                                )}

                                {(() => {
                                    // Group messages by Date/Time Header
                                    const groups: { key: string; messages: typeof displayedMessages }[] = [];
                                    let currentGroup: { key: string; messages: typeof displayedMessages } | null = null;

                                    displayedMessages.forEach((msg) => {
                                        const dateProp = isScheduledView ? msg.scheduledFor : msg.createdAt;
                                        // Use existing helper but pass args
                                        // Scheduled: Group by Minute (true)
                                        // Normal: Group by Day (false)
                                        const includeTime = isScheduledView;
                                        const key = dateProp ? formatDateHeader(dateProp, includeTime) : 'Unknown Date';

                                        if (!currentGroup || currentGroup.key !== key) {
                                            currentGroup = { key, messages: [] };
                                            groups.push(currentGroup);
                                        }
                                        currentGroup.messages.push(msg);
                                    });

                                    return (
                                        <>
                                            {groups.map((group, groupIndex) => (
                                                <div key={group.key + groupIndex} className="relative flex flex-col gap-1.5">
                                                    {/* Group Header (Static) */}
                                                    <div className="flex justify-center py-4 mb-2 pointer-events-none fade-in">
                                                        <span className="text-xs font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full shadow-sm border border-white/40 tracking-wide uppercase">
                                                            {isScheduledView ? `${t('scheduled_for')} ${group.key}` : group.key}
                                                        </span>
                                                    </div>

                                                    {/* Messages in this group */}
                                                    {group.messages.map((msg) => (
                                                        <React.Fragment key={msg.id}>
                                                            <div id={`msg-${msg.id}`} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'} relative`}>


                                                                <div
                                                                    className={`max-w-[85%] sm:max-w-[75%] px-3 py-2 text-[14px] md:text-[15px] leading-relaxed relative shadow-sm group ${msg.sender === 'doctor'
                                                                        ? 'gel-blue-style text-white rounded-2xl md:rounded-3xl bubble-tail-out'
                                                                        : 'bg-white text-slate-800 rounded-2xl md:rounded-3xl bubble-tail-in'
                                                                        } ${editingMessageId === msg.id ? 'w-full min-w-0 sm:min-w-[300px]' : ''} ${msg.isPinned ? 'ring-2 ring-blue-400/30' : ''}`}
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        setContextMenuMessageId(msg.id);
                                                                    }}
                                                                >

                                                                    {/* Pinned Icon (Visual Indicator) */}
                                                                    {msg.isPinned && (
                                                                        <div className="absolute -right-2 -top-2 bg-blue-500 text-white rounded-full p-0.5 shadow-sm scale-75 z-10">
                                                                            <Pin size={12} fill="white" />
                                                                        </div>
                                                                    )}

                                                                    {/* Actions Menu (Right-Click Context Menu) */}
                                                                    {editingMessageId !== msg.id && contextMenuMessageId === msg.id && (
                                                                        <div
                                                                            className={`absolute z-20 animate-in fade-in zoom-in-95 duration-150 ${msg.sender === 'doctor' ? 'right-0 md:right-full md:mr-2 top-full mt-1 md:top-0 md:mt-0' : 'left-0 md:left-full md:ml-2 top-full mt-1 md:top-0 md:mt-0'} flex flex-col gap-1`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onContextMenu={(e) => e.stopPropagation()}
                                                                        >
                                                                            <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl p-1.5 flex flex-col gap-0.5 items-stretch border border-slate-200/50">
                                                                                {/* Reply */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setReplyingToMessage(msg);
                                                                                        textareaRef.current?.focus();
                                                                                        setContextMenuMessageId(null);
                                                                                    }}
                                                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                                                                >
                                                                                    <Reply size={16} />
                                                                                    <span>Reply</span>
                                                                                </button>
                                                                                {/* Copy */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        navigator.clipboard.writeText(msg.text);
                                                                                        setContextMenuMessageId(null);
                                                                                    }}
                                                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors text-sm font-medium"
                                                                                >
                                                                                    <Copy size={16} />
                                                                                    <span>Copy</span>
                                                                                </button>

                                                                                {/* Pin */}
                                                                                <button
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        await handleTogglePin(msg);
                                                                                        setContextMenuMessageId(null);
                                                                                    }}
                                                                                    className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium ${msg.isPinned ? 'text-promed-primary' : 'text-slate-600 hover:text-promed-primary'}`}
                                                                                >
                                                                                    {msg.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                                                                    <span>{msg.isPinned ? 'Unpin' : 'Pin'}</span>
                                                                                </button>

                                                                                {/* Edit/Delete (Only for My Messages) */}
                                                                                {msg.sender === 'doctor' && (
                                                                                    <>
                                                                                        <div className="h-px bg-slate-100 my-1" />
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setEditingMessageId(msg.id);
                                                                                                setMessageInput(msg.text);
                                                                                                setTimeout(() => textareaRef.current?.focus(), 10);
                                                                                                setContextMenuMessageId(null);
                                                                                            }}
                                                                                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-promed-primary rounded-lg transition-colors text-sm font-medium"
                                                                                        >
                                                                                            <Edit2 size={16} />
                                                                                            <span>Edit</span>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setMessageToDelete(msg);
                                                                                                setIsDeleteModalOpen(true);
                                                                                                setContextMenuMessageId(null);
                                                                                            }}
                                                                                            className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
                                                                                        >
                                                                                            <Trash2 size={16} />
                                                                                            <span>Delete</span>
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Reply Context (Quoted Message) */}
                                                                    {msg.replyTo && (
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const el = document.getElementById(`msg-${msg.replyTo!.id}`);
                                                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            }}
                                                                            className={`mb-2 border-l-[3px] rounded-r-md px-2 py-1 cursor-pointer text-xs transition-colors ${msg.sender === 'doctor'
                                                                                ? 'border-white/60 bg-white/10 hover:bg-white/20'
                                                                                : 'border-promed-primary bg-promed-light/50 hover:bg-promed-light'
                                                                                }`}
                                                                        >
                                                                            <div className={`font-black uppercase tracking-widest text-[10px] ${msg.sender === 'doctor' ? 'text-white/90' : 'text-promed-primary'}`}>
                                                                                {msg.replyTo.displayName || (msg.replyTo.sender === 'doctor' ? 'Doctor' : 'Patient')}
                                                                            </div>
                                                                            <div className={`truncate ${msg.sender === 'doctor' ? 'text-white/80' : 'text-slate-600'}`}>{msg.replyTo.text}</div>
                                                                        </div>
                                                                    )}

                                                                    {msg.text && (
                                                                        <p className="whitespace-pre-wrap break-words">
                                                                            {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                                                                                if (part.match(/https?:\/\/[^\s]+/)) {
                                                                                    return (
                                                                                        <a
                                                                                            key={index}
                                                                                            href={part}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-blue-500 hover:underline"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            {part}
                                                                                        </a>
                                                                                    );
                                                                                }
                                                                                return part;
                                                                            })}
                                                                        </p>
                                                                    )}
                                                                    {msg.preview && (
                                                                        <div className="mt-2 mb-1 border-l-[3px] border-[#3390EC] pl-2 rounded-sm overflow-hidden cursor-pointer hover:bg-black/5 transition-colors" onClick={() => window.open(msg.preview?.url, '_blank')}>
                                                                            <div className="text-[#3390EC] font-semibold text-sm line-clamp-1">{msg.preview.title || "Link Preview"}</div>
                                                                            <div className="text-sm text-black/80 line-clamp-2">{msg.preview.description}</div>
                                                                            {msg.preview.image && (
                                                                                <img src={msg.preview.image} alt="Preview" className="mt-1 rounded-md w-full h-32 object-cover" />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className={`text-[11px] mt-1 flex items-center justify-end gap-1 select-none ${msg.sender === 'doctor' ? 'text-white/80' : 'text-slate-400'
                                                                        }`}>
                                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                        {msg.sender === 'doctor' && (
                                                                            <span>
                                                                                {(msg.status === 'seen' || msg.status === 'delivered') ? (
                                                                                    // Double Check (Delivered/Seen)
                                                                                    <CheckCheck size={16} className="text-white" />
                                                                                ) : (
                                                                                    // Single Check (Sent)
                                                                                    <Check size={16} className="text-white/70" />
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    ))
                                                    }
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Scroll Bottom Button */}
                            {
                                showScrollButton && (
                                    <button
                                        onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                        className="absolute bottom-4 right-4 bg-slate-500/50 hover:bg-slate-600/60 backdrop-blur-sm text-white p-2 rounded-full shadow-lg transition-all duration-300 animate-fade-in z-20"
                                    >
                                        <ChevronDown size={24} />
                                    </button>
                                )
                            }
                        </div >

                        {/* Input Area - White Theme */}
                        < div className="p-2 md:p-3 bg-white relative z-10" >
                            {/* Emoji Picker Popover */}
                            {
                                showEmojiPicker && (
                                    <div className="absolute bottom-16 md:bottom-20 left-0 md:left-2 z-50 shadow-xl rounded-2xl border border-slate-100 max-w-[calc(100vw-16px)]">
                                        <div className="relative">
                                            <EmojiPicker
                                                emojiStyle={EmojiStyle.APPLE}
                                                onEmojiClick={(emojiData) => {
                                                    setMessageInput(prev => prev + emojiData.emoji);
                                                }}
                                                theme={Theme.LIGHT}
                                                lazyLoadEmojis={true}
                                                searchDisabled={false}
                                                width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 16, 300) : 300}
                                                height={350}
                                                previewConfig={{ showPreview: false }}
                                            />
                                        </div>
                                        <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmojiPicker(false)} />
                                    </div>
                                )
                            }

                            {/* Reply Indicator (Banner) */}
                            {
                                replyingToMessage && (
                                    <div className="flex items-center justify-between px-3 md:px-4 py-2 border-t border-l border-r border-promed-primary/20 bg-white mx-1 md:mx-2 border-b-0 rounded-t-xl mb-[-4px] relative z-0 animate-slide-up shadow-sm">
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0 flex-1">
                                            <div className="h-8 w-1 bg-promed-primary rounded-full flex-shrink-0"></div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-promed-primary text-[10px] md:text-xs font-black uppercase tracking-wide flex items-center gap-1">
                                                    <Reply size={12} />
                                                    <span className="truncate">Reply to {replyingToMessage.sender === 'doctor' ? 'Yourself' : selectedPatient.fullName}</span>
                                                </span>
                                                <span className="text-slate-600 text-xs truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs font-black">{replyingToMessage.text}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setReplyingToMessage(null)}
                                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )
                            }

                            {/* Edit Mode Indicator */}
                            {
                                editingMessageId && (
                                    <div className="flex items-center justify-between px-4 py-2 border-t border-l border-r border-promed-primary/20 bg-promed-light/80 backdrop-blur-sm rounded-t-xl mb-[-1px] relative z-20 animate-slide-up">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-1 bg-promed-primary rounded-full"></div>
                                            <div className="flex flex-col">
                                                <span className="text-promed-primary text-xs font-black uppercase tracking-wide">Edit Message</span>
                                                <span className="text-slate-600 text-xs truncate max-w-[200px] md:max-w-xs font-black">{messages.find(m => m.id === editingMessageId)?.text}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingMessageId(null);
                                                setMessageInput('');
                                            }}
                                            className="p-1 hover:bg-promed-light rounded-full text-slate-400 hover:text-promed-primary transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                )
                            }

                            <div className="flex items-end gap-1 md:gap-2 bg-white p-0.5 md:p-1 rounded-xl">

                                {/* Schedule Modal */}
                                <ScheduleModal
                                    isOpen={isScheduleModalOpen}
                                    onClose={() => setIsScheduleModalOpen(false)}
                                    onSchedule={(date) => {
                                        setIsScheduleModalOpen(false);
                                        // Send message with schedule
                                        handleSendMessage(date);
                                    }}
                                />

                                {/* Send Button Context Menu */}
                                {sendButtonContextMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setSendButtonContextMenu(null)}
                                            onContextMenu={(e) => { e.preventDefault(); setSendButtonContextMenu(null); }}
                                        ></div>
                                        <div
                                            className="fixed z-50 bg-[#1C1C1E]/90 backdrop-blur-md text-white rounded-lg shadow-2xl py-1 w-48 border border-white/10 animate-scale-in origin-bottom-right"
                                            style={{ top: sendButtonContextMenu.y - 110, left: sendButtonContextMenu.x - 180 }}
                                        >
                                            <button
                                                onClick={() => {
                                                    setSendButtonContextMenu(null);
                                                    setIsScheduleModalOpen(true);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-center gap-3 transition-colors"
                                            >
                                                <CalendarClock size={16} />
                                                <span className="text-sm font-medium">Schedule Message</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSendButtonContextMenu(null);
                                                    handleSendMessage(); // Just send normally? Or send silent? 
                                                    // For now, keep it simple or implement Silent later
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-center gap-3 transition-colors text-white/90"
                                            >
                                                <BellOff size={16} />
                                                <span className="text-sm font-medium">Send Without Sound</span>
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* 1. Emoji (Left) */}

                                {/* 1. Emoji (Left) */}
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2 md:p-3 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-promed-primary' : 'text-slate-400'}`}
                                    disabled={isSending}
                                >
                                    <Smile size={22} className="md:w-6 md:h-6" />
                                </button>

                                {/* 2. Input (Middle) */}
                                <textarea
                                    ref={textareaRef}
                                    onFocus={handleMarkAsRead} // Mark read on focus
                                    value={messageInput}
                                    onChange={(e) => {
                                        setMessageInput(e.target.value);
                                        adjustTextareaHeight();
                                        handleTyping();
                                    }}
                                    placeholder={t('placeholder_type_message') || "Write a message..."}
                                    disabled={isSending}
                                    autoComplete="off"
                                    spellCheck={false}
                                    style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none px-0 py-2.5 md:py-3 text-[16px] resize-none min-h-[40px] md:min-h-[44px] overflow-hidden w-full placeholder:text-slate-400 text-black disabled:opacity-50"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (isScheduledView) {
                                                setIsScheduleModalOpen(true);
                                            } else {
                                                handleSendMessage();
                                            }
                                        }
                                    }}
                                />

                                {/* 3. Send Button (Telegram Blue Plane) */}
                                {/* 3. Send Button (Telegram Context Menu) */}
                                <button
                                    ref={sendButtonRef}
                                    onClick={(e) => {
                                        if (!isSending && messageInput.trim()) {
                                            if (isScheduledView) {
                                                setIsScheduleModalOpen(true);
                                            } else {
                                                handleSendMessage();
                                            }
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (messageInput.trim()) {
                                            setSendButtonContextMenu({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        if (!messageInput.trim()) return;
                                        longPressTimeoutRef.current = setTimeout(() => {
                                            // Trigger context menu for mobile
                                            const touch = e.touches[0];
                                            setSendButtonContextMenu({ x: touch.clientX, y: touch.clientY });
                                        }, 500); // 500ms long press
                                    }}
                                    onTouchEnd={() => {
                                        if (longPressTimeoutRef.current) {
                                            clearTimeout(longPressTimeoutRef.current);
                                        }
                                    }}
                                    disabled={!messageInput.trim() || isSending}
                                    className={`p-2 md:p-3 rounded-full transition-all duration-200 flex-shrink-0 flex items-center justify-center ${!messageInput.trim() ? 'text-promed-primary opacity-50 cursor-not-allowed' : 'text-promed-primary hover:bg-promed-light hover:scale-110 active:scale-90'}`}
                                    title="Send Message (Hold for options)"
                                >
                                    {isSending ? (
                                        <ButtonLoader />
                                    ) : editingMessageId ? (
                                        <Check size={24} className="ml-0.5 mt-0.5" />
                                    ) : (
                                        <Send size={22} className="ml-1.5 mt-0.5 md:ml-2 md:mt-1 rotate-45" fill="currentColor" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6">
                        <div className="w-[150px] md:w-[200px] opacity-80 mb-4 grayscale-[10%]">
                            <Lottie animationData={chatAnimation} loop={true} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2 text-center">
                            {t('no_chat_selected') || 'Suhbat tanlanmagan'}
                        </h3>
                        <p className="text-slate-400 text-sm max-w-xs text-center font-medium leading-relaxed">
                            {t('select_patient_msg') || 'Xabarlar tarixini ko‘rish uchun chap menyudan bemorni tanlang.'}
                        </p>
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
        </div >
    );
};
