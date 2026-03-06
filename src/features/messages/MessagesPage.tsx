// @ts-ignore
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Patient } from '../../types';
import { Search, Send, User, Smile, Trash2, Edit2, X, Check, CheckCheck, ChevronDown, Copy, Reply, Pin, PinOff, CalendarClock, Clock, BellOff, Paperclip, Image as ImageIcon, FileVideo } from 'lucide-react';
import { ProfileAvatar } from '../../components/layout/ProfileAvatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { uz, ru, enGB } from 'date-fns/locale';

import { useToast } from '../../contexts/ToastContext';
import DeleteModal from '../../components/ui/DeleteModal';
import { ScheduleModal } from '../../components/ui/ScheduleModal'; // NEW
import { BroadcastModal } from './BroadcastModal';
import { ProBadge } from '../../components/ui/ProBadge';
import { db, storage, rtdb } from '../../lib/firebase';
import { ref as dbRef, onValue, set as rtdbSet } from 'firebase/database';
import { Portal } from '../../components/ui/Portal';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, limitToLast, startAfter, endBefore, limit, getDocs, where, writeBatch, QueryDocumentSnapshot, DocumentData, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';



import { Play, Pause, Loader2, MoreHorizontal, Megaphone } from 'lucide-react';
import { ButtonLoader } from '../../components/ui/LoadingSpinner';
import Lottie from 'lottie-react';
import chatAnimation from '../../assets/images/mascots/chat.json';

interface MessagesPageProps {
    patients?: Patient[];
    isVisible?: boolean;
    initialPatientId?: string | null;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'doctor';
    time: string;
    createdAt: string;
    image?: string;
    voice?: string;
    video?: string;
    mediaUrl?: string;
    type?: string;
    telegramMessageId?: number;
    status?: 'sent' | 'delivered' | 'seen' | 'scheduled'; // Updated status
    scheduledFor?: string; // New field
    scheduledTimestamp?: string; // Legacy/Fallback
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

import { useAccount } from '../../contexts/AccountContext';
import { useAppSounds } from '../../hooks/useAppSounds';

export const MessagesPage: React.FC<MessagesPageProps> = ({ patients = [], isVisible = true, initialPatientId = null }) => {
    const { t, language } = useLanguage();
    const { accountId, userId } = useAccount(); // Get auth context
    const { playNotification } = useAppSounds();
    const [permissionError, setPermissionError] = useState(false); // New state for rule debugging
    const prevMessageCountRef = useRef<number>(0); // Track message count for notification sound

    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);

    // Auto-select patient from notification tap
    useEffect(() => {
        if (initialPatientId && initialPatientId !== selectedPatientId) {
            setSelectedPatientId(initialPatientId);
        }
    }, [initialPatientId]);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchText, setSearchText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isScheduledView, setIsScheduledView] = useState(false);

    // Media Attachment
    const [fileAttachment, setFileAttachment] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Context Menu State (Global Fixed Positioning)
    const [msgContextMenu, setMsgContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

    // Optimization State
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Initial load state
    const [oldestDoc, setOldestDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [patientIsTyping, setPatientIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // messagesEndRef handled in scrolling logic
    const { error: showToastError, success: showToastSuccess } = useToast();


    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    // Get Pinned Messages (Multiple support)
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
        if (!msgContextMenu) return;

        const handleClickOutside = () => setMsgContextMenu(null);
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [msgContextMenu]);


    // Filter & Sort patients (Telegram-style: most recent message on top)
    const filteredPatients = useMemo(() => {
        return patients
            .filter(p => p.fullName.toLowerCase().includes(searchText.toLowerCase()))
            .sort((a, b) => {
                // Primary: lastMessageTimestamp
                // Secondary: lastActive (for cases where they interact but don't message)
                const timeA = (a.lastMessageTimestamp || a.lastActive) ? new Date(a.lastMessageTimestamp || a.lastActive!).getTime() : 0;
                const timeB = (b.lastMessageTimestamp || b.lastActive) ? new Date(b.lastMessageTimestamp || b.lastActive!).getTime() : 0;
                return timeB - timeA; // Descending: most recent first
            });
    }, [patients, searchText]);

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
    useEffect(() => {
        if (!selectedPatientId || !messagesContentRef.current) return;

        // Wait for messages to populate before restoring scroll (unless it's truly empty)
        if (messages.length === 0 && !isScheduledView) return;

        // If we just switched patients/views, attempt to position
        if (justSwitchedRef.current) {
            if (!isScheduledView) {
                // ALWAYS scroll to bottom for Chat when opening
                messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
                // Double check in next frame ensures layout is stable for large images
                requestAnimationFrame(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
                    justSwitchedRef.current = false;
                });
            } else {
                if (messagesContentRef.current) messagesContentRef.current.scrollTop = 0;
                justSwitchedRef.current = false;
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
        // Also auto-scroll if a NEW incoming message arrives
        else {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.sender === 'user' && !isScheduledView) {
                // Checking if the incoming message is new (based on count tracking done in snapshot listener)
                // The snapshot listener updates prevMessageCountRef BEFORE setting state, but the length is compared there. 
                // We can just rely on smooth scrolling to bottom if the last message is from the user.
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages, selectedPatientId, isScheduledView]);

    // Fetch Messages (with Pagination & Local Cache)
    useEffect(() => {
        if (!selectedPatientId) {
            setMessages([]);
            return;
        }

        // 2. Initial Realtime Listener (Limit to 30)
        setIsLoading(true);
        console.log(`🔄 Setting up real-time listener for patient ${selectedPatientId}...`);

        // 3. Simple Query (Most Robust)
        // We removed the 'account_id' filter because it was causing "permission-denied" errors, 
        // likely due to missing composite indexes or because the user already has access via the parent patient document.
        const q = query(
            collection(db, 'patients', selectedPatientId, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        prevMessageCountRef.current = 0; // Reset on patient switch

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`📨 Snapshot received: ${snapshot.docs.length} messages (from ${snapshot.metadata.fromCache ? 'CACHE' : 'SERVER'})`);

            const msgs = snapshot.docs.map(doc => {
                const data = doc.data();
                // Normalize legacy media fields
                // Old messages might have mediaUrl + type instead of video/image
                if (data.mediaUrl && !data.video && !data.image) {
                    if (data.type === 'video' || data.mediaType === 'video') {
                        data.video = data.mediaUrl;
                    } else if (data.type === 'image' || data.mediaType === 'image') {
                        data.image = data.mediaUrl;
                    }
                }
                return { id: doc.id, ...data };
            }).reverse() as Message[];

            // 🔔 Detect NEW incoming message and play notification sound
            if (prevMessageCountRef.current > 0 && msgs.length > prevMessageCountRef.current && !snapshot.metadata.fromCache) {
                // Only check messages that are genuinely new (not from loadMore prepend)
                const latestMsg = msgs[msgs.length - 1];
                if (latestMsg && latestMsg.sender === 'user') {
                    console.log('🔔 New incoming message detected, playing notification');
                    try { playNotification(); } catch (e) { /* sound failed silently */ }
                }
            }
            prevMessageCountRef.current = msgs.length;

            setMessages(msgs);

            if (snapshot.docs.length > 0) {
                setOldestDoc(snapshot.docs[snapshot.docs.length - 1]);
                setHasMore(snapshot.docs.length === 30);
            } else {
                setHasMore(false);
            }
            setIsLoading(false); // Data loaded
        }, (error) => {
            console.error("❌ Snapshot listener error:", error);
            // If permission denied on the filtered query, maybe fallback?
            // Usually permission denied means we violated the rule.
            if (error.code === 'permission-denied') {
                console.error("🚨 PERMISSION DENIED: Check Firestore Rules for 'messages' collection.");
                console.error("   Requesting Account ID:", accountId);
            }
            setIsLoading(false);
        });

        // 3. Hear Typing Status from RTDB (Cheaper & Faster than Firestore)
        const patientTypingRef = dbRef(rtdb, `status/${selectedPatientId}/userIsTyping`);
        const unsubTyping = onValue(patientTypingRef, (snapshot) => {
            setPatientIsTyping(snapshot.val() || false);
        });

        return () => {
            console.log(`🔌 Unsubscribing from patient ${selectedPatientId} listeners`);
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
            const newMsgs = snapshot.docs.map(doc => {
                const data = doc.data();
                if (data.mediaUrl && !data.video && !data.image) {
                    if (data.type === 'video' || data.mediaType === 'video') {
                        data.video = data.mediaUrl;
                    } else if (data.type === 'image' || data.mediaType === 'image') {
                        data.image = data.mediaUrl;
                    }
                }
                return { id: doc.id, ...data };
            }).reverse() as Message[];

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

        // Use Realtime Database for volatile typing state (Zero Firestore Write Cost)
        const doctorTypingRef = dbRef(rtdb, `status/${selectedPatientId}/doctorIsTyping`);

        rtdbSet(doctorTypingRef, true).catch(e => console.error("Typing error", e));

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            rtdbSet(doctorTypingRef, false).catch(() => { });
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

    // AUTO mark-as-read: When doctor opens/views a patient's chat, reset unread count immediately (Telegram-style)
    useEffect(() => {
        if (!selectedPatientId) return;
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient && patient.unreadCount && patient.unreadCount > 0) {
            console.log('👀 Auto-marking as read for patient:', selectedPatientId);
            updateDoc(doc(db, 'patients', selectedPatientId), { unreadCount: 0 })
                .catch(err => console.warn('Failed to auto-mark as read:', err));
        }
    }, [selectedPatientId, patients]);


    // Mark messages as SEEN in Firestore (Batched) - Only when page is visible
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

    // CLIENT-SIDE SCHEDULED MESSAGE PROCESSOR (Self-Healing Fallback)
    // Runs every 30 seconds to catch any scheduled messages whose time has passed.
    // This is critical because the Cloud Function scheduler might miss messages
    // (e.g., if the outbound doc was never created, or the function had a cold start delay).
    useEffect(() => {
        if (!selectedPatientId || !selectedPatient) return;

        const processScheduledMessages = async () => {
            const now = new Date();
            const dueMessages = messages.filter(msg => {
                if (msg.status !== 'scheduled') return false;
                const scheduledTime = msg.scheduledFor;
                if (!scheduledTime) return false;
                return new Date(scheduledTime) <= now;
            });

            if (dueMessages.length === 0) return;

            console.log(`⏰ Client-side scheduler: Found ${dueMessages.length} due scheduled message(s). Processing...`);

            for (const msg of dueMessages) {
                try {
                    // 1. Update the message status in patient's messages subcollection
                    const msgRef = doc(db, 'patients', selectedPatientId, 'messages', msg.id);
                    await updateDoc(msgRef, {
                        status: 'sent',
                        scheduledFor: null // Clear the scheduled marker
                    });

                    // 2. Create outbound doc (if patient has Telegram) with PENDING status
                    // so the notificationSender Cloud Function trigger fires immediately
                    if (selectedPatient.telegramChatId) {
                        // Check if an outbound doc already exists for this message
                        const existingOutbound = await getDocs(query(
                            collection(db, 'outbound_messages'),
                            where('originalMessageId', '==', msg.id),
                            limit(1)
                        ));

                        // Only create if no outbound doc exists or existing one is stuck in QUEUED
                        if (existingOutbound.empty) {
                            const payload: any = {
                                telegramChatId: selectedPatient.telegramChatId,
                                text: msg.text || '',
                                status: 'PENDING', // CRITICAL: PENDING triggers notificationSender immediately
                                patientId: selectedPatientId,
                                originalMessageId: msg.id,
                                patientName: selectedPatient.fullName,
                                botLanguage: selectedPatient.botLanguage || 'uz',
                                action: 'SEND',
                                createdAt: new Date().toISOString()
                            };

                            if (msg.video) payload.videoUrl = msg.video;
                            if (msg.image) payload.imageUrl = msg.image;

                            await addDoc(collection(db, 'outbound_messages'), payload);
                            console.log(`✅ Client scheduler: Created outbound doc for message ${msg.id}`);
                        } else {
                            // If outbound exists and is QUEUED, flip to PENDING to trigger immediate send
                            const outboundDoc = existingOutbound.docs[0];
                            const outboundData = outboundDoc.data();
                            if (outboundData.status === 'QUEUED') {
                                await updateDoc(outboundDoc.ref, { status: 'PENDING' });
                                console.log(`✅ Client scheduler: Flipped QUEUED→PENDING for ${msg.id}`);
                            }
                        }
                    }

                    // 3. Update patient metadata to show this message in sidebar
                    try {
                        await updateDoc(doc(db, 'patients', selectedPatientId), {
                            lastMessage: msg.video ? `[Video] ${msg.text || ''}` : msg.image ? `[Rasm] ${msg.text || ''}` : msg.text,
                            lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                            lastMessageTimestamp: new Date().toISOString()
                        });
                    } catch (e) {
                        console.error('⚠️ Patient metadata update failed (non-fatal):', e);
                    }

                    console.log(`✅ Scheduled message ${msg.id} processed successfully`);
                } catch (error) {
                    console.error(`❌ Failed to process scheduled message ${msg.id}:`, error);
                }
            }
        };

        // Run immediately once, then every 30 seconds
        processScheduledMessages();
        const interval = setInterval(processScheduledMessages, 30_000);

        return () => clearInterval(interval);
    }, [messages, selectedPatientId, selectedPatient]);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [messageInput]);


    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async (scheduledDateArg?: Date) => {
        if ((!messageInput.trim() && !fileAttachment) || !selectedPatient || isSending) {
            return;
        }

        if (editingMessageId) {
            await handleUpdateMessage(editingMessageId);
            return;
        }

        setIsSending(true);
        isUserSendingMessage.current = true; // Set flag to trigger auto-scroll on update

        console.log(`📤 Sending message to patient ${selectedPatient.id} (${selectedPatient.fullName}):`);

        try {
            const now = new Date();

            let mediaUrl = null;
            let mediaType = null;

            if (fileAttachment) {
                let currentFileToUpload = fileAttachment;
                mediaType = fileAttachment.type.startsWith('video/') ? 'video' : 'image';

                // 1. Client-Side Image Compression Strategy BEFORE Upload
                if (mediaType === 'image') {
                    console.log(`🖼️ Original Image Size: ${(fileAttachment.size / 1024 / 1024).toFixed(2)} MB`);
                    try {
                        const compressionOptions = {
                            maxSizeMB: 1, // Target under 1 MB
                            maxWidthOrHeight: 1920, // Maintain Full HD resolution bounds
                            useWebWorker: true,
                        };
                        const compressedBlob = await imageCompression(fileAttachment, compressionOptions);
                        // Make sure to attach the name property back to the blob so storage knows the ext
                        currentFileToUpload = new File([compressedBlob], fileAttachment.name, {
                            type: compressedBlob.type,
                            lastModified: Date.now(),
                        });
                        console.log(`✅ Compressed Image Size: ${(currentFileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
                    } catch (compressionError) {
                        console.error('⚠️ Image Compression Failed, uploading original:', compressionError);
                    }
                }

                const ext = currentFileToUpload.name.split('.').pop();
                const filename = `${selectedPatient.id}_doc_${Date.now()}.${ext}`;
                const storageRef = ref(storage, `chat_media/${filename}`);

                // Use resumable upload for progress tracking
                mediaUrl = await new Promise<string>((resolve, reject) => {
                    const uploadTask = uploadBytesResumable(storageRef, currentFileToUpload);
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        }
                    );
                });
            }

            // Prepare Message Payload (Robust for Security Rules)
            const messageData: any = {
                text: messageInput.trim(),
                sender: 'doctor', // UI requirement

                // Timestamps (Rules often require serverTimestamp)
                createdAt: now.toISOString(), // Text string for UI fallback
                created_at: serverTimestamp(),       // Firestore Server Time (Rule Req?)
                timestamp: serverTimestamp(),        // Common alias

                // UI Helpers
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || "00:00",
                status: scheduledDateArg ? 'scheduled' : 'sent',
                seen: false,

                // Identity & Permissions (Snake & Camel Case for compatibility)
                account_id: accountId || userId,
                accountId: accountId || userId,
                user_id: userId,
                userId: userId,
                senderId: userId,
                sender_id: userId,
                authorId: userId,

                type: mediaType || 'text'
            };

            if (mediaUrl) {
                if (mediaType === 'video') messageData.video = mediaUrl;
                if (mediaType === 'image') messageData.image = mediaUrl;
            }

            // Handle Scheduling (Local Display)
            if (scheduledDateArg) {
                messageData.scheduledFor = scheduledDateArg.toISOString();
                messageData.status = 'scheduled';
            }

            // Handle Reply
            if (replyingToMessage) {
                messageData.replyTo = {
                    id: replyingToMessage.id,
                    text: replyingToMessage.text || '', // FALLBACK
                    sender: replyingToMessage.sender || 'unknown' // FALLBACK
                };
            }

            console.log("🚀 Sending Message Payload:", messageData); // Debug Log

            // 1. Add Message to Firestore -> patients/{patientId}/messages
            const docRef = await addDoc(collection(db, 'patients', selectedPatient.id, 'messages'), messageData);
            console.log(`   ✅ Message written to Firestore with ID: ${docRef.id}`);

            // 2. Update 'lastActive', 'unreadCount', and 'lastMessage'
            // We wrap this in a separate try/catch so it doesn't block the UI if it fails (e.g. ghost patient)
            if (!scheduledDateArg) {
                try {
                    await updateDoc(doc(db, 'patients', selectedPatient.id), {
                        lastMessage: mediaType ? `[${mediaType === 'video' ? 'Video' : 'Rasm'}] ${messageInput.trim()}` : messageInput.trim(),
                        lastMessageTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                        lastMessageTimestamp: now.toISOString()
                    });
                    console.log(`   ✅ Updated patient lastMessage field`);
                } catch (metaError) {
                    console.error("⚠️ Failed to update patient metadata (non-fatal):", metaError);
                }
            }

            // 3. Add to Outbound Queue (for Bot)
            try {
                if (selectedPatient.telegramChatId) {
                    const payload: any = {
                        telegramChatId: selectedPatient.telegramChatId,
                        text: messageInput.trim(),
                        status: scheduledDateArg ? 'QUEUED' : 'PENDING',
                        patientId: selectedPatient.id,
                        originalMessageId: docRef.id,
                        patientName: selectedPatient.fullName,
                        botLanguage: selectedPatient.botLanguage || 'uz',
                        action: 'SEND',
                        createdAt: now.toISOString()
                    };

                    if (mediaUrl && mediaType === 'video') {
                        payload.videoUrl = mediaUrl;
                    }
                    if (mediaUrl && mediaType === 'image') {
                        payload.imageUrl = mediaUrl;
                    }

                    if (scheduledDateArg) {
                        payload.scheduledFor = scheduledDateArg.toISOString();
                    }

                    if (replyingToMessage && replyingToMessage.telegramMessageId) {
                        payload.replyToMessageId = replyingToMessage.telegramMessageId;
                    }

                    await addDoc(collection(db, 'outbound_messages'), payload);
                    console.log("✅ Task added to outbound_messages");
                }
            } catch (queueError) {
                console.error("⚠️ Failed to queue outbound message (non-fatal):", queueError);
            }

            // Success Updates
            setMessageInput('');
            setFileAttachment(null);
            setUploadProgress(0);
            setReplyingToMessage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset height
            }

        } catch (error: any) {
            console.error("❌ Failed to send message (CRITICAL):", error);
            // Show more detailed error for debugging
            const errorMessage = error.code || error.message || "Unknown error";
            showToastError(t('toast_error_title'), `Failed to send: ${errorMessage}`);
        } finally {
            setIsSending(false);
            setUploadProgress(0);
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

        } catch (e: any) {
            console.error("❌ Pin error:", e);
            showToastError("Xatolik", "Xabarni qadashda xatolik yuz berdi");
        }
    };


    const handleUpdateMessage = async (messageId: string) => {
        if (!selectedPatientId || !messageInput.trim() || isSending) return;

        const messageToUpdate = messages.find(m => m.id === messageId);
        if (!messageToUpdate) return;

        setIsSending(true);

        try {
            const newText = messageInput.trim();

            // 1. Update Firestore
            await updateDoc(doc(db, 'patients', selectedPatientId, 'messages', messageId), {
                text: newText
            });

            console.log("🛠 Debug Edit: Msg ID:", messageId);

            // 2. Sync with Telegram Bot
            if (messageToUpdate.telegramMessageId && selectedPatient?.telegramChatId) {
                console.log("✅ Condition Met! Sending EDIT action to bot...");
                try {
                    await addDoc(collection(db, 'outbound_messages'), {
                        telegramChatId: selectedPatient.telegramChatId,
                        telegramMessageId: messageToUpdate.telegramMessageId,
                        text: newText,
                        action: 'EDIT',
                        status: 'PENDING',
                        patientId: selectedPatient.id,
                        patientName: selectedPatient.fullName,
                        createdAt: new Date().toISOString()
                    });
                } catch (botErr) {
                    console.warn('⚠️ Trigger bot edit failed (non-fatal):', botErr);
                }
            }

            // 3. SYNC: Update sidebar preview using local state (reliable)
            try {
                const latestMsg = messages[messages.length - 1];
                if (latestMsg) {
                    // If we edited the latest message, use the new text; otherwise use existing
                    const isLatest = latestMsg.id === messageId;
                    const newPreviewText = isLatest
                        ? newText || (latestMsg.video ? '[Video]' : '') || (latestMsg.image ? '[Rasm]' : '') || (latestMsg.voice ? '[Audio]' : '')
                        : latestMsg.text || (latestMsg.video ? '[Video]' : '') || (latestMsg.image ? '[Rasm]' : '') || (latestMsg.voice ? '[Audio]' : '');

                    await updateDoc(doc(db, 'patients', selectedPatientId), {
                        lastMessage: newPreviewText,
                        lastMessageTimestamp: latestMsg.createdAt,
                        lastMessageTime: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                    });
                }
            } catch (syncErr) {
                console.warn('⚠️ Sidebar sync failed (non-fatal):', syncErr);
            }
        } catch (error) {
            console.error('Error updating message:', error);
            showToastError('Xatolik', 'Xabarni yangilashda xatolik yuz berdi');
        } finally {
            setEditingMessageId(null);
            setMessageInput('');
            setIsSending(false);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    };



    const scrollToAndHighlight = (messageId: string) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Find the actual message bubble (inner div)
            // The structure is <div id="msg-ID" class="flex ..."><div class="bubble ...">
            if (el) {
                // Add highlight class
                el.classList.add('animate-highlight-bg');

                // Remove after animation
                setTimeout(() => {
                    el.classList.remove('animate-highlight-bg');
                }, 2000);
            }
        } else {
            showToastSuccess(t('info'), "Message not loaded in current view.");
        }
    };

    const confirmDeleteMessage = async () => {
        if (!selectedPatientId || !messageToDelete) return;

        // Optimistically close modal immediately
        setIsDeleteModalOpen(false);
        const msg = messageToDelete; // Capture reference
        setMessageToDelete(null); // Clear state

        try {
            // 1. Delete from Firestore messages subcollection
            await deleteDoc(doc(db, 'patients', selectedPatientId, 'messages', msg.id));

            // 2. If it's a scheduled message, also delete from outbound_messages queue
            try {
                const scheduledTime = msg.scheduledFor || msg.scheduledTimestamp;
                if (msg.status === 'scheduled' && scheduledTime && selectedPatient?.telegramChatId) {
                    const outboundQuery = query(
                        collection(db, 'outbound_messages'),
                        where('telegramChatId', '==', selectedPatient.telegramChatId),
                        where('status', '==', 'QUEUED'),
                        where('scheduledFor', '==', scheduledTime),
                        where('text', '==', msg.text)
                    );

                    const outboundSnapshot = await getDocs(outboundQuery);

                    const deleteBatch = writeBatch(db);
                    outboundSnapshot.docs.forEach(doc => {
                        deleteBatch.delete(doc.ref);
                    });
                    await deleteBatch.commit();
                }
            } catch (queueErr) {
                console.warn('⚠️ Outbound queue cleanup failed (non-fatal):', queueErr);
            }

            // 3. If it has a Telegram ID (already sent), trigger bot deletion
            try {
                if (msg.telegramMessageId && selectedPatient?.telegramChatId) {
                    await addDoc(collection(db, 'outbound_messages'), {
                        telegramChatId: selectedPatient.telegramChatId,
                        telegramMessageId: msg.telegramMessageId,
                        action: 'DELETE',
                        status: 'PENDING',
                        patientName: selectedPatient.fullName,
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (botErr) {
                console.warn('⚠️ Bot delete trigger failed (non-fatal):', botErr);
            }

            // 3b. Clean up media from Firebase Storage (fully isolated — never triggers error toast)
            const mediaUrl = msg.video || msg.image;
            if (mediaUrl) {
                try {
                    // Handle both full download URLs and gs:// paths
                    let mediaRef;
                    if (mediaUrl.includes('firebasestorage.googleapis.com') || mediaUrl.startsWith('gs://')) {
                        mediaRef = ref(storage, mediaUrl);
                    } else if (mediaUrl.includes('firebase')) {
                        // Fallback: try to extract the path from the URL
                        try {
                            const url = new URL(mediaUrl);
                            const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/);
                            if (pathMatch) {
                                const decodedPath = decodeURIComponent(pathMatch[1]);
                                mediaRef = ref(storage, decodedPath);
                            }
                        } catch {
                            // URL parsing failed, skip cleanup
                            console.warn('⚠️ Could not parse media URL for cleanup:', mediaUrl);
                        }
                    }
                    if (mediaRef) {
                        await deleteObject(mediaRef);
                        console.log('🗑️ Media file deleted from Storage');
                    }
                } catch (storageErr: any) {
                    // Completely silent — storage cleanup is non-critical
                    // Common: file already deleted, URL format changed, permission issue
                    console.warn('⚠️ Storage cleanup failed (non-fatal):', storageErr?.code || storageErr);
                }
            }

            // 4. SYNC: Update Patient's lastMessage field using LOCAL state (more reliable than re-querying Firestore)
            try {
                const patientRef = doc(db, 'patients', selectedPatientId);

                // Use already-loaded messages, filter out the one we just deleted
                const remainingMessages = messages
                    .filter(m => m.id !== msg.id && m.status !== 'scheduled')
                    .sort((a, b) => {
                        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return timeB - timeA; // Newest first
                    });

                if (remainingMessages.length > 0) {
                    const latestMsg = remainingMessages[0];
                    const previewText = latestMsg.text
                        || (latestMsg.video ? '[Video]' : '')
                        || (latestMsg.image ? '[Rasm]' : '')
                        || (latestMsg.voice ? '[Audio]' : '');
                    const timestamp = latestMsg.createdAt || new Date().toISOString();
                    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                    await updateDoc(patientRef, {
                        lastMessage: previewText,
                        lastMessageTimestamp: timestamp,
                        lastMessageTime: timeStr
                    });
                    console.log('✅ Sidebar synced to:', previewText);
                } else {
                    await updateDoc(patientRef, {
                        lastMessage: '',
                        lastMessageTimestamp: null,
                        lastMessageTime: ''
                    });
                    console.log('✅ Sidebar cleared (no messages left)');
                }
            } catch (metaErr) {
                console.warn('⚠️ Patient metadata sync after delete failed (non-fatal):', metaErr);
            }

            // 5. Scroll to close any gaps from deleted large media
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 150);

        } catch (error) {
            console.error('Error deleting message:', error);
            showToastError("Xatolik", "O'chirishda xatolik yuz berdi");
        }
    };

    // Filter Scheduled vs Normal Messages
    const displayedMessages = useMemo(() => {
        if (isScheduledView) {
            return messages
                .filter(m => m.status === 'scheduled')
                .sort((a, b) => {
                    const dateA = (a.scheduledFor || a.scheduledTimestamp) ? new Date(a.scheduledFor || a.scheduledTimestamp!).getTime() : 0;
                    const dateB = (b.scheduledFor || b.scheduledTimestamp) ? new Date(b.scheduledFor || b.scheduledTimestamp!).getTime() : 0;
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
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <h2 className="font-bold text-xl md:text-2xl text-slate-800 tracking-tight">{t('messages')}</h2>
                        <button
                            onClick={() => setIsBroadcastModalOpen(true)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition-colors flex items-center justify-center shadow-sm"
                            title="Barchaga xabar yuborish"
                        >
                            <Megaphone size={18} />
                        </button>
                    </div>
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
                            className={`p-3.5 rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-300 mx-1 ${selectedPatientId === patient.id
                                ? 'gel-blue-style text-white shadow-lg shadow-blue-500/30 scale-[1.02] border-none active:scale-100'
                                : 'hover:bg-slate-50 border border-transparent active:scale-95'
                                }`}
                        >
                            <div className="relative flex-shrink-0 z-10">
                                <ProfileAvatar src={patient.profileImage} alt={patient.fullName} size={52} className="rounded-full ring-2 ring-white shadow-sm" optimisticId={patient.id} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                        <h4 className={`font-bold text-sm md:text-base truncate ${selectedPatientId === patient.id ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
                                            <span className="truncate">{patient.fullName}</span>
                                            {patient.tier === 'pro' && <span className="flex-shrink-0"><ProBadge size={16} className={selectedPatientId === patient.id ? 'text-white' : ''} /></span>}
                                        </h4>
                                    </div>
                                    <span className={`text-[10px] md:text-xs font-semibold whitespace-nowrap ml-2 ${selectedPatientId === patient.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {patient.lastMessageTimestamp
                                            ? new Date(patient.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                            : patient.lastMessageTime || ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs md:text-sm truncate max-w-[180px] ${selectedPatientId === patient.id ? 'text-blue-100' : 'text-slate-500'} font-medium`}>
                                        {patient.lastMessage || t('no_messages_yet')}
                                    </p>
                                    {patient.unreadCount && patient.unreadCount > 0 ? (
                                        <span className={`flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[10px] font-bold rounded-full shadow-lg ml-2 z-10 relative ${selectedPatientId === patient.id ? 'bg-white text-[#0044FF]' : 'gel-blue-style text-white border-none'}`}>
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
                className={`flex-1 flex-col bg-[#F8FAFC] border-l-[3px] border-r-[3px] border-white ${selectedPatientId ? 'flex' : 'hidden md:flex'}`}
                onClickCapture={handleMarkAsRead}
            >
                {/* Permission Error Helper */}
                {permissionError && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-8">
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-200 max-w-lg text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Database Permission Denied</h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                Your Firebase Security Rules are blocking access to messages.
                            </p>
                            <div className="bg-gray-900 text-left p-4 rounded-lg overflow-x-auto mb-4">
                                <code className="text-xs text-green-400 font-mono">
                                    {`// Add this to your Firestore Rules:
match /patients/{patientId}/messages/{messageId} {
  allow read, write: if request.auth != null;
}`}
                                </code>
                            </div>
                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                onClick={() => window.open('https://console.firebase.google.com', '_blank')}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
                            >
                                Open Firebase Console
                            </motion.button>
                        </div>
                    </div>
                )}

                {isLoading && !permissionError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                        <div className="w-8 h-8 border-2 border-promed-primary/30 border-t-promed-primary rounded-full animate-spin"></div>
                    </div>
                )}

                {selectedPatient ? (
                    <>
                        {/* Header */}
                        <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-b border-slate-200 shadow-sm z-20 sticky top-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={() => setSelectedPatientId(null)}
                                        className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <ChevronDown className="rotate-90" size={22} />
                                    </motion.button>
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
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={() => setIsScheduledView(false)}
                                        className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black rounded-md transition-all ${!isScheduledView ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        {t('tab_chat')}
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={() => setIsScheduledView(true)}
                                        className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black rounded-md transition-all ${isScheduledView ? 'bg-white text-promed-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        <CalendarClock size={12} className="hidden sm:block md:w-[14px] md:h-[14px]" />
                                        <span className="hidden sm:inline">{t('tab_scheduled')}</span>
                                        <CalendarClock size={14} className="sm:hidden" />
                                    </motion.button>
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
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePin(currentPinned);
                                        }}
                                        className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                                        title="Unpin"
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* Messages List - Professional Style */}
                        <div className="flex-1 relative bg-[#F0F2F5]">
                            <div
                                ref={messagesContentRef}
                                onScroll={(e) => {
                                    handleScroll();

                                    // Scroll Button Visibility Logic
                                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
                                    setShowScrollButton(!isNearBottom);
                                }}
                                className="absolute inset-0 overflow-y-auto px-2 md:px-4 pt-3 md:pt-4 pb-1 no-scrollbar flex flex-col min-h-full"
                            >
                                {hasMore && !loadingMore && !isScheduledView && (
                                    <div className="flex justify-center pb-4">
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={loadMoreMessages}
                                            className="text-xs text-slate-500 bg-white/60 hover:bg-white px-3 py-1 rounded-full shadow-sm transition-colors"
                                        >
                                            {t('load_more') || "Load previous messages"}
                                        </motion.button>
                                    </div>
                                )}
                                {loadingMore && (
                                    <div className="flex justify-center pb-4">
                                        <Loader2 size={16} className="animate-spin text-slate-500" />
                                    </div>
                                )}

                                {isLoading && messages.length === 0 && (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 size={32} className="animate-spin text-slate-400" />
                                    </div>
                                )}

                                {!isLoading && displayedMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                        <div className="mb-4 p-6 rounded-full bg-slate-50 shadow-sm border border-slate-100">
                                            {isScheduledView ? (
                                                <CalendarClock size={48} className="text-slate-300" />
                                            ) : (
                                                <User size={48} className="text-slate-300" />
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-base font-medium mb-2">
                                            {isScheduledView ? t('no_scheduled_messages') : t('no_messages_yet')}
                                        </p>
                                    </div>
                                )}

                                {(() => {
                                    // Group messages by Date/Time Header
                                    const groups: { key: string; messages: typeof displayedMessages }[] = [];
                                    let currentGroup: { key: string; messages: typeof displayedMessages } | null = null;

                                    displayedMessages.forEach((msg) => {
                                        const dateProp = isScheduledView ? (msg.scheduledFor || msg.scheduledTimestamp) : msg.createdAt;
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
                                        <div className="flex flex-col min-h-full">
                                            {/* Spacer pushes messages to bottom when few */}
                                            <div className="flex-grow min-h-[10px]" />
                                            <div className="flex flex-col space-y-4 chat-breathing-room">
                                                {groups.map((group, groupIndex) => (
                                                    <div key={group.key + groupIndex} className="relative flex flex-col">
                                                        {/* Group Header (Static) */}
                                                        <div className="flex justify-center py-4 mb-2 pointer-events-none fade-in">
                                                            <span className="text-xs font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full shadow-sm border border-white/40 tracking-wide uppercase">
                                                                {isScheduledView ? `${t('scheduled_for')} ${group.key}` : group.key}
                                                            </span>
                                                        </div>

                                                        {/* Messages in this group */}
                                                        <div className="flex flex-col space-y-2 md:space-y-3">
                                                            {group.messages.map((msg) => (
                                                                <div id={`msg-${msg.id}`} key={msg.id} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'} relative px-2 md:px-0`}>
                                                                    {/* UNIFIED BUBBLE MESSAGE — Text, Images, and Videos integrated into a single premium bubble */}
                                                                    <div
                                                                        className={`${(!msg.image && !msg.video) ? 'max-w-[85%] sm:max-w-[75%] px-3 py-1' : 'max-w-[260px] sm:max-w-[320px] md:max-w-[380px] p-1 inline-block'} text-[14px] md:text-[15px] leading-relaxed relative shadow-sm group cursor-pointer transition-transform active:scale-[0.98] ${msg.sender === 'doctor'
                                                                            ? 'bg-telegram-blue text-white rounded-[18px] mb-1 bubble-tail-out border-none'
                                                                            : 'bg-white text-slate-800 rounded-[18px] mb-1 bubble-tail-in border-none'
                                                                            } ${msg.isPinned ? 'ring-2 ring-blue-400/30' : ''}`}
                                                                        onContextMenu={(e) => {
                                                                            e.preventDefault();
                                                                            setMsgContextMenu({ id: msg.id, x: e.clientX, y: e.clientY });
                                                                        }}
                                                                        onTouchStart={(e) => {
                                                                            const touch = e.touches[0];
                                                                            const timer = setTimeout(() => {
                                                                                setMsgContextMenu({ id: msg.id, x: touch.clientX, y: touch.clientY });
                                                                            }, 500);
                                                                            (window as any).__lastTouchTimer = timer;
                                                                        }}
                                                                        onTouchEnd={() => {
                                                                            clearTimeout((window as any).__lastTouchTimer);
                                                                        }}
                                                                    >
                                                                        {msg.isPinned && (
                                                                            <div className="absolute -right-2 -top-2 bg-blue-500 text-white rounded-full p-0.5 shadow-sm scale-75 z-10">
                                                                                <Pin size={12} fill="white" />
                                                                            </div>
                                                                        )}
                                                                        {msg.replyTo && (
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (msg.replyTo) {
                                                                                        scrollToAndHighlight(msg.replyTo.id);
                                                                                    }
                                                                                }}
                                                                                className={`mb-2 mx-1 border-l-[3px] rounded-r-md px-2 py-1 cursor-pointer text-xs transition-colors ${msg.sender === 'doctor'
                                                                                    ? 'border-white/60 bg-white/10 hover:bg-white/20'
                                                                                    : 'border-promed-primary bg-promed-light/50 hover:bg-promed-light'
                                                                                    }`}
                                                                            >
                                                                                <div className={`font-black uppercase tracking-widest text-[10px] ${msg.sender === 'doctor' ? 'text-white/90' : 'text-promed-primary'}`}>
                                                                                    {msg.replyTo.displayName || (msg.replyTo.sender === 'doctor' ? t('doctor') : t('patient'))}
                                                                                </div>
                                                                                <div className={`truncate ${msg.sender === 'doctor' ? 'text-white/80' : 'text-slate-600'}`}>{msg.replyTo.text}</div>
                                                                            </div>
                                                                        )}

                                                                        {/* Render Media (Image or Video) tightly attached to the top */}
                                                                        {(msg.image || msg.video) && (
                                                                            <div className="relative mb-1 flex items-center justify-center rounded-[14px] overflow-hidden bg-black shadow-sm">
                                                                                {msg.image ? (
                                                                                    <img src={msg.image} alt="Attachment" className="w-full h-auto object-contain bg-black/5" />
                                                                                ) : (
                                                                                    <video
                                                                                        src={msg.video}
                                                                                        controls
                                                                                        preload="metadata"
                                                                                        playsInline
                                                                                        className="w-full max-h-80 object-contain bg-black"
                                                                                        style={{ minWidth: '220px' }}
                                                                                        onLoadedMetadata={(e) => {
                                                                                            const vid = e.currentTarget;
                                                                                            if (vid.currentTime === 0) {
                                                                                                vid.currentTime = 0.5;
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                )}

                                                                                {/* Time Overlay ONLY if NO text caption exists */}
                                                                                {!msg.text && (
                                                                                    <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-none z-10">
                                                                                        <span className="text-[10px] text-white/90 font-medium">
                                                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                                        </span>
                                                                                        {msg.sender === 'doctor' && (
                                                                                            <span className="flex items-center">
                                                                                                {(msg.status === 'seen' || msg.status === 'delivered') ? (
                                                                                                    <CheckCheck size={12} className="text-white/90" />
                                                                                                ) : (
                                                                                                    <Check size={12} className="text-white/70" />
                                                                                                )}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Message Text Area */}
                                                                        <div className={`flex flex-col relative ${(msg.image || msg.video) ? 'px-2 pb-1' : ''}`}>
                                                                            {msg.text && (
                                                                                <div className="whitespace-pre-wrap break-words pr-2">
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
                                                                                </div>
                                                                            )}

                                                                            {/* Integrated Timestamp (if text exists) */}
                                                                            {msg.text && (
                                                                                <div className={`text-[10px] sm:text-[11px] mt-0.5 self-end flex items-center justify-end gap-1 select-none pointer-events-none ${msg.sender === 'doctor' ? 'text-white/70' : 'text-slate-400'}`}>
                                                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                                    {msg.sender === 'doctor' && (
                                                                                        <span className="flex items-center">
                                                                                            {(msg.status === 'seen' || msg.status === 'delivered') ? (
                                                                                                <CheckCheck size={13} className="text-white/90" />
                                                                                            ) : (
                                                                                                <Check size={13} className="text-white/60" />
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {msg.preview && !msg.image && !msg.video && (
                                                                                <div className="mt-2 mb-1 border-l-[3px] border-[#3390EC] pl-2 rounded-sm overflow-hidden cursor-pointer hover:bg-black/5 transition-colors" onClick={() => window.open(msg.preview?.url, '_blank')}>
                                                                                    <div className="text-[#3390EC] font-semibold text-sm line-clamp-1">{msg.preview.title || "Link Preview"}</div>
                                                                                    <div className="text-sm text-black/80 line-clamp-2">{msg.preview.description}</div>
                                                                                    {msg.preview.image && (
                                                                                        <img src={msg.preview.image} alt="Preview" className="mt-1 rounded-md w-full h-32 object-cover" />
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div ref={messagesEndRef} className="h-4" />
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Scroll Bottom Button */}
                            {
                                showScrollButton && (
                                    <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                        onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                        className="absolute bottom-4 right-4 bg-slate-500/50 hover:bg-slate-600/60 backdrop-blur-sm text-white p-2 rounded-full shadow-lg transition-all duration-300 animate-fade-in z-20"
                                    >
                                        <ChevronDown size={24} />
                                    </motion.button>
                                )
                            }
                        </div >

                        {/* Input Area - White Theme */}
                        < div className="p-2 md:p-3 bg-white relative z-10" >
                            {/* Emoji Picker Popover */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                                        className="absolute bottom-16 md:bottom-20 left-0 md:left-2 z-50 shadow-2xl rounded-2xl border border-slate-100 max-w-[calc(100vw-16px)] overflow-hidden"
                                    >
                                        <div className="relative">
                                            <EmojiPicker
                                                emojiStyle={EmojiStyle.APPLE}
                                                onEmojiClick={(emojiData) => {
                                                    setMessageInput(prev => prev + emojiData.emoji);
                                                }}
                                                theme={Theme.LIGHT}
                                                lazyLoadEmojis={true}
                                                searchDisabled={false}
                                                width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 16, 310) : 310}
                                                height={380}
                                                previewConfig={{ showPreview: false }}
                                            />
                                        </div>
                                        <div className="fixed inset-0 z-[-1] pointer-events-auto" onClick={() => setShowEmojiPicker(false)} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {replyingToMessage && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, y: 10 }}
                                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                                        exit={{ height: 0, opacity: 0, y: 10 }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                        className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-l border-r border-promed-primary/20 bg-white mx-1 md:mx-2 border-b-0 rounded-t-[20px] mb-[-4px] relative z-0 shadow-sm overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0 flex-1">
                                            <div className="h-10 w-1 bg-promed-primary rounded-full flex-shrink-0"></div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-promed-primary text-[10px] md:text-xs font-black uppercase tracking-wide flex items-center gap-1">
                                                    <Reply size={14} className="stroke-[2.5]" />
                                                    <span className="truncate">Reply to {replyingToMessage.sender === 'doctor' ? 'Yourself' : selectedPatient?.fullName}</span>
                                                </span>
                                                <span className="text-slate-600 text-sm truncate max-w-[200px] sm:max-w-[400px] md:max-w-xl font-bold">{replyingToMessage.text}</span>
                                            </div>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => setReplyingToMessage(null)}
                                            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </motion.button>
                                    </motion.div>
                                )}

                                {editingMessageId && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, y: 10 }}
                                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                                        exit={{ height: 0, opacity: 0, y: 10 }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                        className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-l border-r border-promed-primary/20 bg-promed-light/40 backdrop-blur-md mx-1 md:mx-2 border-b-0 rounded-t-[20px] mb-[-1px] relative z-0 shadow-sm overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-10 w-1 bg-promed-primary rounded-full"></div>
                                            <div className="flex flex-col">
                                                <span className="text-promed-primary text-[10px] md:text-xs font-black uppercase tracking-wide flex items-center gap-1">
                                                    <Edit2 size={14} className="stroke-[2.5]" />
                                                    <span>Edit Message</span>
                                                </span>
                                                <span className="text-slate-600 text-sm truncate max-w-[200px] md:max-w-xl font-bold">{messages.find(m => m.id === editingMessageId)?.text}</span>
                                            </div>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={() => {
                                                setEditingMessageId(null);
                                                setMessageInput('');
                                                if (textareaRef.current) textareaRef.current.style.height = 'auto';
                                            }}
                                            className="p-1.5 hover:bg-white/50 rounded-full text-slate-400 hover:text-promed-primary transition-colors"
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-end gap-2 bg-slate-100 p-2 rounded-2xl relative">

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
                                <AnimatePresence>
                                    {sendButtonContextMenu && (
                                        <Portal lockScroll={false}>
                                            <div className="fixed inset-0 z-[99999] pointer-events-none">
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute inset-0 bg-black/5 pointer-events-auto"
                                                    onClick={() => setSendButtonContextMenu(null)}
                                                    onContextMenu={(e) => { e.preventDefault(); setSendButtonContextMenu(null); }}
                                                />
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                                    exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                                                    className="fixed z-[100000] bg-[#1C1C1E]/95 backdrop-blur-xl text-white rounded-[20px] shadow-2xl py-1.5 w-56 border border-white/10 pointer-events-auto overflow-hidden"
                                                    style={{
                                                        top: sendButtonContextMenu.y - 120,
                                                        left: Math.min(sendButtonContextMenu.x - 210, window.innerWidth - 240)
                                                    }}
                                                >
                                                    <motion.button whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                        onClick={() => {
                                                            setSendButtonContextMenu(null);
                                                            setIsScheduleModalOpen(true);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors active:bg-white/20"
                                                    >
                                                        <CalendarClock size={18} className="text-white/70" />
                                                        <span className="text-sm font-bold tracking-tight">Schedule Message</span>
                                                    </motion.button>
                                                    <div className="h-px bg-white/10 mx-2" />
                                                    <motion.button whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                        onClick={() => {
                                                            setSendButtonContextMenu(null);
                                                            handleSendMessage(); // Just send normally? Or send silent? 
                                                            // For now, keep it simple or implement Silent later
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3 transition-colors text-white/90 active:bg-white/20"
                                                    >
                                                        <BellOff size={18} className="text-white/70" />
                                                        <span className="text-sm font-bold tracking-tight">Send Without Sound</span>
                                                    </motion.button>
                                                </motion.div>
                                            </div>
                                        </Portal>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {fileAttachment && (
                                        <Portal lockScroll={true}>
                                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-hidden pointer-events-none">
                                                {/* Backdrop */}
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                                                    onClick={() => { setFileAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                />

                                                {/* Modal Content */}
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.9, opacity: 0 }}
                                                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                                                    className="bg-white shadow-2xl w-full max-w-lg md:max-w-2xl flex flex-col relative pointer-events-auto overflow-hidden"
                                                    style={{ borderRadius: '24px' }}
                                                >
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between px-4 py-3 relative z-10 w-full">
                                                        <motion.button whileTap={{ scale: 0.9 }}
                                                            onClick={() => { setFileAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors order-1"
                                                        >
                                                            <X size={20} />
                                                        </motion.button>
                                                        <div className="text-[16px] font-semibold tracking-wide order-2 text-slate-800">
                                                            1 Media
                                                        </div>
                                                        <div className="w-8 order-3"></div> {/* Placeholder to keep header balanced */}
                                                    </div>

                                                    {/* Media Canvas */}
                                                    <div className="w-full flex items-center justify-center bg-slate-50 relative overflow-hidden group border-y border-slate-100" style={{ minHeight: '30vh', maxHeight: '55vh' }}>
                                                        {fileAttachment.type.startsWith('video/') ? (
                                                            <video
                                                                src={URL.createObjectURL(fileAttachment)}
                                                                controls
                                                                className="max-w-full max-h-[55vh] object-contain"
                                                            />
                                                        ) : (
                                                            <img src={URL.createObjectURL(fileAttachment)} className="max-w-full max-h-[55vh] object-contain" />
                                                        )}

                                                        {/* Upload progress overlay */}
                                                        {isSending && uploadProgress > 0 && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
                                                                <div className="relative flex items-center justify-center w-20 h-20">
                                                                    <svg className="animate-spin text-blue-500 w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    <span className="absolute text-sm font-bold text-slate-800 shadow-sm">{uploadProgress}%</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Editing / Input Area attached at the bottom */}
                                                    <div className="p-3 md:p-4 w-full bg-white rounded-b-[24px]">
                                                        <div className="flex bg-slate-100 rounded-2xl items-end relative w-full border border-slate-200">
                                                            <motion.button whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}
                                                                className="p-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                                                                disabled={isSending}
                                                            >
                                                                <Smile size={24} />
                                                            </motion.button>

                                                            <textarea
                                                                autoFocus
                                                                value={messageInput}
                                                                onChange={(e) => {
                                                                    setMessageInput(e.target.value);
                                                                    handleTyping();
                                                                }}
                                                                placeholder="Write a message..."
                                                                disabled={isSending}
                                                                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-1 py-3.5 text-[15px] resize-none min-h-[44px] max-h-[120px] w-full placeholder:text-slate-400 text-slate-800 font-medium my-auto mt-0.5"
                                                                rows={1}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        if (isScheduledView) setIsScheduleModalOpen(true);
                                                                        else handleSendMessage();
                                                                    }
                                                                }}
                                                            />

                                                            <div className="p-2 flex-shrink-0 mb-0.5 mr-0.5">
                                                                <motion.button whileTap={{ scale: 0.9 }}
                                                                    onClick={() => {
                                                                        if (!isSending) {
                                                                            if (isScheduledView) setIsScheduleModalOpen(true);
                                                                            else handleSendMessage();
                                                                        }
                                                                    }}
                                                                    disabled={isSending}
                                                                    className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${isSending ? 'bg-slate-300 text-white' : 'gel-blue-style text-white shadow-md hover:shadow-lg active:scale-95 border-none'}`}
                                                                >
                                                                    <Send size={18} className="ml-1" />
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </Portal>
                                    )}
                                </AnimatePresence>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setFileAttachment(file);
                                            // The video is now previewed directly via a <video> element

                                            setTimeout(() => textareaRef.current?.focus(), 100);
                                        }
                                    }}
                                />

                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2.5 rounded-xl hover:bg-white transition-all flex-shrink-0 ${fileAttachment ? 'text-blue-500 bg-white shadow-sm' : 'text-slate-400'}`}
                                    disabled={isSending}
                                    title="Attach Media"
                                >
                                    <Paperclip size={24} />
                                </motion.button>

                                {/* 1. Emoji (Left) */}
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2.5 rounded-xl hover:bg-white transition-all flex-shrink-0 ${showEmojiPicker ? 'text-blue-500 bg-white shadow-sm' : 'text-slate-400'}`}
                                    disabled={isSending}
                                >
                                    <Smile size={24} />
                                </motion.button>

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
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none px-2 py-3 text-[16px] resize-none min-h-[44px] max-h-[150px] w-full placeholder:text-slate-400 text-slate-900 disabled:opacity-50 font-medium"
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

                                {/* 3. Send Button (Right) */}
                                <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                    ref={sendButtonRef}
                                    onClick={(e) => {
                                        if (!isSending && (messageInput.trim() || fileAttachment)) {
                                            if (isScheduledView) {
                                                setIsScheduleModalOpen(true);
                                            } else {
                                                handleSendMessage();
                                            }
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (messageInput.trim() || fileAttachment) {
                                            setSendButtonContextMenu({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        if (!messageInput.trim() && !fileAttachment) return;
                                        // e.preventDefault(); // CAREFUL: This might block click
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
                                    disabled={(!messageInput.trim() && !fileAttachment) || isSending}
                                    className={`p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 flex items-center justify-center ${(!messageInput.trim() && !fileAttachment) ? 'text-slate-400 cursor-not-allowed' : 'gel-blue-style border-none text-white shadow-md active:scale-95'}`}
                                    title="Send Message (Hold for options)"
                                >
                                    {isSending ? (
                                        <div className="w-6 h-6 flex items-center justify-center"><Loader2 size={18} className="animate-spin" /></div>
                                    ) : editingMessageId ? (
                                        <Check size={20} />
                                    ) : (
                                        <Send size={20} className={(!messageInput.trim() && !fileAttachment) ? "" : "ml-0.5"} fill={(!messageInput.trim() && !fileAttachment) ? "none" : "currentColor"} />
                                    )}
                                </motion.button>
                            </div>
                        </div >
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
            </div >
            {/* Global Message Context Menu Overlay */}
            {/* Global Message Context Menu Overlay */}
            <AnimatePresence>
                {msgContextMenu && (
                    <Portal lockScroll={false}>
                        <div className="fixed inset-0 z-[99999] pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/5 pointer-events-auto"
                                onMouseDown={(e) => {
                                    if (e.target === e.currentTarget) {
                                        e.preventDefault();
                                        setMsgContextMenu(null);
                                    }
                                }}
                                onContextMenu={(e) => { e.preventDefault(); setMsgContextMenu(null); }}
                            />

                            {(() => {
                                const targetMsg = messages.find(m => m.id === msgContextMenu.id);
                                if (!targetMsg) return null;

                                // Smart Positioning logic
                                const menuWidth = 200;
                                const menuHeight = 280;
                                let x = msgContextMenu.x;
                                let y = msgContextMenu.y;

                                // Boundary checks
                                if (x + menuWidth > window.innerWidth) x -= menuWidth;
                                if (y + menuHeight > window.innerHeight) y -= menuHeight;
                                if (x < 0) x = 10;
                                if (y < 0) y = 10;

                                return (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                                        className="fixed z-[100000] shadow-2xl rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-1.5 flex flex-col gap-0.5 min-w-[200px] pointer-events-auto"
                                        style={{ top: y, left: x }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={(e) => {
                                                setMsgContextMenu(null);
                                                setReplyingToMessage(targetMsg);
                                                setTimeout(() => textareaRef.current?.focus(), 100);
                                            }}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl transition-all text-sm font-semibold text-left w-full"
                                        >
                                            <Reply size={18} className="text-slate-400" />
                                            <span>{t('reply')}</span>
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={async (e) => {
                                                setMsgContextMenu(null);
                                                try {
                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                        await navigator.clipboard.writeText(targetMsg.text);
                                                        showToastSuccess(t('success') || 'Bajarildi', t('copied_to_clipboard') || 'Nusxalandi');
                                                    } else {
                                                        const textArea = document.createElement("textarea");
                                                        textArea.value = targetMsg.text;
                                                        document.body.appendChild(textArea);
                                                        textArea.select();
                                                        document.execCommand('copy');
                                                        document.body.removeChild(textArea);
                                                        showToastSuccess(t('success') || 'Bajarildi', t('copied_to_clipboard') || 'Nusxalandi');
                                                    }
                                                } catch (err) {
                                                    console.error("Copy failed:", err);
                                                    showToastError("Xatolik", "Nusxalashda xatolik yuz berdi");
                                                }
                                            }}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl transition-all text-sm font-semibold text-left w-full"
                                        >
                                            <Copy size={18} className="text-slate-400" />
                                            <span>{t('copy')}</span>
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={async (e) => {
                                                // Debug alert removed, relying on console
                                                setMsgContextMenu(null);
                                                try {
                                                    await handleTogglePin(targetMsg);
                                                } catch (err) {
                                                    console.error("Pin action failed:", err);
                                                    alert("Pin action failed: " + err);
                                                }
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-100 rounded-xl transition-all text-sm font-semibold text-left w-full ${targetMsg.isPinned ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'}`}
                                        >
                                            {targetMsg.isPinned ? <PinOff size={18} className="text-blue-500" /> : <Pin size={18} className="text-slate-400" />}
                                            <span>{targetMsg.isPinned ? t('unpin') : t('pin')}</span>
                                        </motion.button>
                                        <div className="h-px bg-slate-100 my-1 mx-2" />
                                        {targetMsg.sender === 'doctor' && (
                                            <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                                onClick={(e) => {
                                                    setMsgContextMenu(null);
                                                    setEditingMessageId(targetMsg.id);
                                                    setMessageInput(targetMsg.text);
                                                    if (textareaRef.current) textareaRef.current.style.height = 'auto';
                                                    setTimeout(() => {
                                                        textareaRef.current?.focus();
                                                        if (textareaRef.current) {
                                                            const scrollHeight = textareaRef.current.scrollHeight;
                                                            textareaRef.current.style.height = `${Math.min(scrollHeight, 150)}px`;
                                                        }
                                                    }, 100);
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl transition-all text-sm font-semibold text-left w-full"
                                            >
                                                <Edit2 size={18} className="text-slate-400" />
                                                <span>{t('edit')}</span>
                                            </motion.button>
                                        )}
                                        <motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}
                                            onClick={(e) => {
                                                setMsgContextMenu(null);
                                                setMessageToDelete(targetMsg);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 rounded-xl transition-all text-sm font-semibold text-left w-full"
                                        >
                                            <Trash2 size={18} className="text-red-400" />
                                            <span>{t('delete')}</span>
                                        </motion.button>
                                    </motion.div>
                                );
                            })()}
                        </div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setMessageToDelete(null);
                }}
                onConfirm={confirmDeleteMessage}
            />

            {/* Broadcast Modal */}
            <BroadcastModal
                isOpen={isBroadcastModalOpen}
                onClose={() => setIsBroadcastModalOpen(false)}
                patients={patients}
            />
        </div >
    );
};
