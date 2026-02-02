import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, addDoc, doc, onSnapshot, increment, deleteDoc, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// --- INSTANCE PROTECTION ---
const PID_FILE = path.join(process.cwd(), 'bot.pid');

function checkSingleInstance() {
    if (fs.existsSync(PID_FILE)) {
        const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
        try {
            // Check if process is actually running
            process.kill(oldPid, 0);
            console.error(`🛑 GHOST DETECTED: Another bot instance (PID: ${oldPid}) is already running.`);
            console.error(`Please kill it first or delete ${PID_FILE}`);
            process.exit(1);
        } catch (e) {
            // Process not found, safe to overwrite
            console.log(`♻️ Cleaning up stale PID file from PID: ${oldPid}`);
        }
    }
    fs.writeFileSync(PID_FILE, process.pid.toString());
}

checkSingleInstance();

// --- CONFIGURATION ---
const BOT_TOKEN = '8591992335:AAHzpuGzTHGvEHZgiQuH1-SgEZsf3l9w_GQ';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);

// AUTHENTICATE BOT
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
const auth = getAuth(app);

const BOT_EMAIL = "system_bot@graft.local";
const BOT_PASS = "BotSecurePassword123!";

async function authenticateBot() {
    try {
        await signInWithEmailAndPassword(auth, BOT_EMAIL, BOT_PASS);
        console.log("🔐 Bot authenticated as:", BOT_EMAIL);
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            console.log("⚠️ Bot account not found, creating new...");
            try {
                await createUserWithEmailAndPassword(auth, BOT_EMAIL, BOT_PASS);
                console.log("✅ Bot account created and authenticated.");
            } catch (createErr) {
                console.error("❌ Failed to create bot account:", createErr);
            }
        } else {
            console.error("❌ Bot auth failed:", error);
        }
    }
}

// --- LOCALIZATION ---
const TEXTS = {
    uz: {
        welcome: "👋 Assalomu alaykum! Iltimos, muloqot tilini tanlang:",
        ask_contact: "📲 Iltimos, telefon raqamingizni yuborish uchun pastdagi tugmani bosing:",
        share_contact_btn: "📱 Telefon raqamni yuborish",
        searching: "🔍 Tekshirilmoqda...",
        not_found: "❌ Kechirasiz, ushbu raqam bazada topilmadi. Iltimos, to'g'ri raqamdan foydalanayotganingizga ishonch hosil qiling yoki administratorga murojaat qiling.\n\n📞 Admin: +998 93 748 91 41",
        success: (name) => `✅ Xush kelibsiz, **Hurmatli ${name}**! Siz tizimga muvaffaqiyatli ulandingiz.`,
        reminder_title: "Eslatma! 🎗",
        injection_msg: (name, date, time) => `Assalomu alaykum, **Hurmatli ${name}**! Sizga inyeksiya belgilanganini eslatib o'tmoqchimiz.\n\n🗓 Sana: **${date}**\n⏰ Vaqt: **${time}**\n\nIltimos, o'z vaqtida keling. O'zingizni ehtiyot qiling! 😊`,
        check_btn: "📅 Jadvalni tekshirish",
        next_injection_found: (name, date, time) => `👤 **Hurmatli ${name}**\n\nSizning navbatdagi inyeksiyangiz:\n🗓 Sana: **${date}**\n⏰ Vaqt: **${time}**`,
        no_injection_found: (name) => `👤 **Hurmatli ${name}**\n\nSizda hozircha rejalashtirilgan inyeksiyalar yo'q. 😊`
    },
    ru: {
        welcome: "👋 Здравствуйте! Пожалуйста, выберите язык:",
        ask_contact: "📲 Пожалуйста, нажмите кнопку ниже, чтобы отправить свой номер телефона:",
        share_contact_btn: "📱 Отправить номер",
        searching: "🔍 Проверка...",
        not_found: "❌ К сожалению, этот номер не найден в базе. Пожалуйста, убедитесь, что вы используете правильный номер, или обратитесь к администратору.\n\n📞 Админ: +998 93 748 91 41",
        success: (name) => `✅ Добро пожаловать, **Уважаемый(ая) ${name}**! Вы успешно подключились к системе.`,
        reminder_title: "Напоминание! 🎗",
        injection_msg: (name, date, time) => `Здравствуйте, **Уважаемый(ая) ${name}**! Напоминаем вам о запланированной инъекции.\n\n🗓 Дата: **${date}**\n⏰ Время: **${time}**\n\nПожалуйста, приходите вовремя. Берегите себя! 😊`,
        check_btn: "📅 Проверить график",
        next_injection_found: (name, date, time) => `👤 **Уважаемый(ая) ${name}**\n\nВаша следующая инъекция:\n🗓 Дата: **${date}**\n⏰ Время: **${time}**`,
        no_injection_found: (name) => `👤 **Уважаемый(ая) ${name}**\n\nУ вас пока нет запланированных инъекций. 😊`
    },
    en: {
        welcome: "👋 Hello! Please choose your language:",
        ask_contact: "📲 Please press the button below to share your phone number:",
        share_contact_btn: "📱 Share Phone Number",
        searching: "🔍 Checking...",
        not_found: "❌ Sorry, this number was not found in our database. Please make sure you are using the correct number or contact an administrator.\n\n📞 Admin: +998 93 748 91 41",
        success: (name) => `✅ Welcome, **Dear ${name}**! You have successfully connected to the system.`,
        reminder_title: "Reminder! 🎗",
        injection_msg: (name, date, time) => `Hello **Dear ${name}**! Just a reminder about your scheduled injection.\n\n🗓 Date: **${date}**\n⏰ Time: **${time}**\n\nPlease come on time. Take care! 😊`,
        check_btn: "📅 Check Schedule",
        next_injection_found: (name, date, time) => `👤 **Dear ${name}**\n\nYour next scheduled injection:\n🗓 Date: **${date}**\n⏰ Time: **${time}**`,
        no_injection_found: (name) => `👤 **Dear ${name}**\n\nYou have no upcoming injections scheduled. 😊`
    }
};

const userSessions = {};

// --- SECURITY ---
const ALLOWED_USER_IDS = [1907166652, 123456789];
const SCAM_REGEX = /(tonplay|free\s*spin|bonus\s*\d+|crypto\s*giveaway)/i;

bot.use(async (ctx, next) => {
    const user = ctx.from;
    if (!user) return next();
    console.log(`🛡️ Access Check: User ${user.first_name} (${user.id})`);
    await next();
});

bot.use(async (ctx, next) => {
    const message = ctx.message || ctx.editedMessage;
    if (!message) return next();
    const content = (message.text || "") + (message.caption || "");
    if (SCAM_REGEX.test(content)) {
        try {
            await ctx.deleteMessage();
            if (ctx.chat.type !== 'private') await ctx.banChatMember(message.from.id);
        } catch (e) { console.error(e); }
        return;
    }
    await next();
});

// --- ADMIN COMMANDS ---
const startTime = new Date();

bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    // Check if it's the admin (Mirjalol)
    if (userId !== 1907166652) return ctx.reply("⛔ Restricted.");

    const uptime = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    // Count pending tasks
    const tasksRef = collection(db, 'outbound_tasks');
    const q = query(tasksRef, where("status", "==", "PENDING"));
    const snapshot = await getDocs(q);

    const mem = process.memoryUsage().rss / 1024 / 1024;

    const statusMsg = `
🤖 *Bot Status Report*
━━━━━━━━━━━━━━
⏱ *Uptime:* ${hours}h ${mins}m
🆔 *PID:* ${process.pid}
📥 *Pending Tasks:* ${snapshot.size}
🧠 *Memory:* ${mem.toFixed(1)} MB
📡 *Firestore:* Connected
🔍 *Polling:* Active (3s)
━━━━━━━━━━━━━━
    `;
    ctx.reply(statusMsg, { parse_mode: 'Markdown' });
});

bot.on('chat_join_request', async (ctx) => {
    const user = ctx.chatJoinRequest.from;
    try { await ctx.approveChatJoinRequest(user.id); } catch (e) { }
});

// --- DELETE SYNC (Telegram -> Dashboard) ---
// Use Hears Regex for robustness (case insensitive, spaces)
bot.hears(/^\/del/i, async (ctx) => {
    const message = ctx.message;
    const userId = ctx.from.id.toString();

    // 1. Check if it's a reply
    if (!message.reply_to_message) {
        return ctx.reply("⚠️ Reply to a message with /del to delete it.", { parse_mode: 'Markdown' })
            .then(m => setTimeout(() => ctx.deleteMessage(m.message_id).catch(() => { }), 3000));
    }

    const targetMsgId = message.reply_to_message.message_id;
    console.log(`🗑 Delete request from ${ctx.from.first_name} for msg ${targetMsgId}`);

    try {
        // 2. Delete from Telegram (Both Original & Command)
        await ctx.deleteMessage(targetMsgId).catch(e => console.error("Telegram Delete Error:", e.message));
        await ctx.deleteMessage(message.message_id).catch(e => console.error("Cmd Delete Error:", e.message));

        // 3. Find Patient
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("telegramChatId", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn(`⚠️ Delete from unknown user ${userId}`);
            return;
        }

        const patientId = snapshot.docs[0].id;

        // 4. Find & Delete from Firestore
        const msgsRef = collection(db, 'promed_passengers', patientId, 'messages');
        let qMsg = query(msgsRef, where("telegramMessageId", "==", targetMsgId));
        let msgSnapshot = await getDocs(qMsg);

        // FALLBACK: If not found by ID, try Text Match (for old messages)
        if (msgSnapshot.empty) {
            const replyText = message.reply_to_message.text || message.reply_to_message.caption;
            if (replyText) {
                console.log(`⚠️ Search by ID failed, trying TEXT match: "${replyText.substring(0, 15)}..."`);
                qMsg = query(msgsRef, where("text", "==", replyText)); // limit(1)?
                msgSnapshot = await getDocs(qMsg);
            }
        }

        if (!msgSnapshot.empty) {
            // Delete ALL matches (duplicates?) or just first? Just first to be safe, or Loop.
            // Let's delete the most recent one if multiple.
            msgSnapshot.forEach(async (docSnap) => {
                await deleteDoc(docSnap.ref);
                console.log(`✅ Synced Delete for Patient ${patientId} (Doc: ${docSnap.id})`);
            });
        } else {
            console.warn(`⚠️ Original message not found in DB (ID or Text): ${targetMsgId}`);
            ctx.reply("⚠️ Could not find this message in the dashboard to delete.", { parse_mode: 'Markdown' })
                .then(m => setTimeout(() => ctx.deleteMessage(m.message_id).catch(() => { }), 3000));
        }

    } catch (e) {
        console.error("❌ Delete Sync Error:", e);
    }
});

// --- EDIT SYNC (Telegram -> Dashboard) ---
bot.on('edited_message', async (ctx) => {
    const message = ctx.editedMessage;
    const userId = ctx.from.id.toString();
    const text = message.text || message.caption;

    if (!text) return; // Only sync text edits for now

    console.log(`✏️ Edit detected from ${ctx.from.first_name} (${userId})`);

    try {
        // 1. Find Patient
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("telegramChatId", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn(`⚠️ Edit from unknown user ${userId}`);
            return;
        }

        const patientId = snapshot.docs[0].id;

        // 2. Find Message in Subcollection
        const msgsRef = collection(db, 'promed_passengers', patientId, 'messages');
        const qMsg = query(msgsRef, where("telegramMessageId", "==", message.message_id));
        const msgSnapshot = await getDocs(qMsg);

        if (msgSnapshot.empty) {
            console.warn(`⚠️ Original message not found for edit: ${message.message_id}`);
            return;
        }

        // 3. Update Firestore
        const msgDoc = msgSnapshot.docs[0];
        await updateDoc(doc(db, 'promed_passengers', patientId, 'messages', msgDoc.id), {
            text: text,
            isEdited: true, // Optional: show "edited" label in UI later
            updatedAt: new Date().toISOString()
        });

        console.log(`✅ Synced Edit for Patient ${patientId} (Msg: ${message.message_id})`);

    } catch (e) {
        console.error("❌ Edit Sync Error:", e);
    }
});

// --- BOT LOGIC ---
bot.start(async (ctx) => {
    await ctx.reply('...', Markup.removeKeyboard()).then((m) => ctx.deleteMessage(m.message_id).catch(() => { }));
    ctx.reply(TEXTS.uz.welcome, Markup.inlineKeyboard([
        [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz')],
        [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
        [Markup.button.callback('🇬🇧 English', 'lang_en')]
    ]));
});

['uz', 'ru', 'en'].forEach(lang => {
    bot.action(`lang_${lang}`, async (ctx) => {
        const userId = ctx.from.id;
        userSessions[userId] = { lang };
        try { await ctx.answerCbQuery(); } catch (e) { }
        await ctx.reply(TEXTS[lang].ask_contact, Markup.keyboard([
            [Markup.button.contact(TEXTS[lang].share_contact_btn)]
        ]).resize().oneTime());
    });
});

bot.on('contact', async (ctx) => {
    const userId = ctx.from.id;
    const contact = ctx.message.contact;
    const lang = userSessions[userId]?.lang || 'en';

    if (contact.user_id !== userId) return ctx.reply("❌ Please send your own contact.");

    await ctx.reply(TEXTS[lang].searching, Markup.removeKeyboard());

    try {
        let phone = contact.phone_number;
        if (!phone.startsWith('+')) phone = '+' + phone;

        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return ctx.reply(TEXTS[lang].not_found);

        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data();
        const patientId = patientDoc.id;

        await updateDoc(doc(db, 'patients', patientId), {
            telegramChatId: userId.toString(),
            botLanguage: lang
        });

        await ctx.replyWithMarkdown(TEXTS[lang].success(patientData.fullName));
        await ctx.reply("👇", Markup.keyboard([[TEXTS[lang].check_btn]]).resize());

    } catch (error) {
        console.error("Error during verification:", error);
        ctx.reply("⚠️ System error. Please try again later.");
    }
});

async function checkSchedule(ctx) {
    const userId = ctx.from.id;
    try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("telegramChatId", "==", userId.toString()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return ctx.reply("❌ Not found.");

        const patient = snapshot.docs[0].data();
        const lang = patient.botLanguage || 'uz';
        const name = patient.fullName || "Patient";

        if (patient.injections && Array.isArray(patient.injections)) {
            const now = new Date();
            const nowStr = now.toISOString().split('T')[0];
            const upcoming = patient.injections
                .filter(inj => inj.status === 'Scheduled' && inj.date >= nowStr)
                .sort((a, b) => a.date.localeCompare(b.date));

            if (upcoming.length > 0) {
                const nextInj = upcoming[0];
                let time = "09:00";
                if (nextInj.date.includes('T')) time = nextInj.date.split('T')[1].substring(0, 5);
                const d = new Date(nextInj.date.split('T')[0]);
                const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                ctx.reply(TEXTS[lang].next_injection_found(name, dateDisplay, time), { parse_mode: 'Markdown' });
            } else {
                ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
            }
        } else {
            ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error(error);
        ctx.reply("⚠️ Error.");
    }
}

bot.hears([TEXTS.uz.check_btn, TEXTS.ru.check_btn, TEXTS.en.check_btn], (ctx) => checkSchedule(ctx));

// --- TEXT, PHOTO & VOICE HANDLER (Includes Delete Logic) ---
bot.on(['text', 'photo', 'voice'], async (ctx) => {
    const chatId = ctx.from.id.toString();
    const message = ctx.message;
    const text = message.text || message.caption || "";

    console.log(`📩 Incoming from ${ctx.from.first_name} (${chatId}) | Text: "${text.substring(0, 20)}..."`);

    // --- MANUAL DELETE COMMAND CHECK ---
    if (text.toLowerCase().startsWith('/del')) {
        console.log(`🗑 Delete command detected manually: ${text}`);

        // 1. Check if it's a reply
        if (!message.reply_to_message) {
            return ctx.reply("⚠️ Reply to a message with /del to delete it.", { parse_mode: 'Markdown' })
                .then(m => setTimeout(() => ctx.deleteMessage(m.message_id).catch(() => { }), 3000));
        }

        const targetMsgId = message.reply_to_message.message_id;

        try {
            // 2. Delete from Telegram
            await ctx.deleteMessage(targetMsgId).catch(e => console.error("Telegram Delete Error:", e.message));
            await ctx.deleteMessage(message.message_id).catch(e => console.error("Cmd Delete Error:", e.message));

            // 3. Find Patient & Delete from Firestore
            const patientsRef = collection(db, 'patients');
            const q = query(patientsRef, where("telegramChatId", "==", chatId));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return; // Unknown user

            const patientId = snapshot.docs[0].id;
            const msgsRef = collection(db, 'promed_passengers', patientId, 'messages');

            // Try ID Match
            let qMsg = query(msgsRef, where("telegramMessageId", "==", targetMsgId));
            let msgSnapshot = await getDocs(qMsg);

            // Fallback: Text Match
            if (msgSnapshot.empty) {
                const replyText = message.reply_to_message.text || message.reply_to_message.caption;
                if (replyText) {
                    console.log(`⚠️ Search by ID failed, trying TEXT match: "${replyText.substring(0, 15)}..."`);
                    qMsg = query(msgsRef, where("text", "==", replyText));
                    msgSnapshot = await getDocs(qMsg);
                }
            }

            if (!msgSnapshot.empty) {
                msgSnapshot.forEach(async (docSnap) => {
                    await deleteDoc(docSnap.ref);
                    console.log(`✅ Synced Delete for Patient ${patientId} (Doc: ${docSnap.id})`);
                });
            } else {
                console.warn(`⚠️ Dashboard delete failed: Message not found.`);
                ctx.reply("⚠️ Could not find message in dashboard to delete.", { parse_mode: 'Markdown' })
                    .then(m => setTimeout(() => ctx.deleteMessage(m.message_id).catch(() => { }), 3000));
            }

        } catch (e) {
            console.error("❌ Delete Error:", e);
        }
        return; // STOP HERE
    }

    // IGNORE OTHER COMMANDS
    if (text.startsWith('/')) {
        console.log("⚠️ Ignoring other command.");
        return;
    }

    try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("telegramChatId", "==", chatId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return;

        const patientDoc = querySnapshot.docs[0];
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();

        let lastMsgText = "Attachment";
        if (message.text) lastMsgText = message.text;
        else if (message.photo) lastMsgText = "📷 Photo";
        else if (message.voice) lastMsgText = "🎤 Voice Message";

        await updateDoc(doc(db, 'patients', patientId), {
            lastActive: new Date().toISOString(),
            unreadCount: increment(1),
            lastMessage: lastMsgText,
            lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            userIsTyping: false // Reset typing on message
        });

        // --- MARK PREVIOUS DOCTOR MESSAGES AS SEEN ---
        try {
            const msgsToMark = await getDocs(query(
                collection(db, 'promed_passengers', patientId, 'messages'),
                where('sender', '==', 'doctor')
                // Removed status != seen to avoid composite index requirement
            ));

            const batchPromises = msgsToMark.docs
                .filter(m => m.data().status !== 'seen')
                .map(m => updateDoc(m.ref, { status: 'seen' }));

            await Promise.all(batchPromises);
        } catch (markErr) {
            console.warn("⚠️ Non-critical: Failed to mark seen status:", markErr.message);
        }

        let textContent = '';
        let imageUrl = null;

        if (message.text) textContent = message.text;
        else if (message.caption) textContent = message.caption;

        if (message.photo) {
            try {
                const fileId = message.photo[message.photo.length - 1].file_id;
                const fileLink = await ctx.telegram.getFileLink(fileId);

                // --- PERSIST TO FIREBASE STORAGE ---
                console.log(`📥 Downloading image from Telegram: ${fileId}`);
                const response = await fetch(fileLink.href);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const storagePath = `chat_images/${patientId}/${Date.now()}_tg.jpg`;
                const imageRef = ref(storage, storagePath);

                await uploadBytes(imageRef, buffer, { contentType: 'image/jpeg' });
                imageUrl = await getDownloadURL(imageRef);
                console.log(`✅ Persisted to Storage: ${imageUrl.substring(0, 40)}...`);
            } catch (storageErr) {
                console.error("❌ Storage Upload Error (Photo):", storageErr);
                const fileId = message.photo[message.photo.length - 1].file_id;
                const fileLink = await ctx.telegram.getFileLink(fileId);
                imageUrl = fileLink.href;
            }
        }

        let voiceUrl = null;
        if (message.voice) {
            try {
                const fileId = message.voice.file_id;
                const fileLink = await ctx.telegram.getFileLink(fileId);

                console.log(`📥 Downloading voice from Telegram: ${fileId}`);
                const response = await fetch(fileLink.href);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const storagePath = `chat_voices/${patientId}/${Date.now()}_tg.ogg`;
                const voiceRef = ref(storage, storagePath);

                await uploadBytes(voiceRef, buffer, { contentType: 'audio/ogg' });
                voiceUrl = await getDownloadURL(voiceRef);
                console.log(`✅ Voice Persisted to Storage: ${voiceUrl.substring(0, 40)}...`);
            } catch (storageErr) {
                console.error("❌ Storage Upload Error (Voice):", storageErr);
                const fileId = message.voice.file_id;
                const fileLink = await ctx.telegram.getFileLink(fileId);
                voiceUrl = fileLink.href;
            }
        }

        if (!textContent && !imageUrl && !voiceUrl) return;

        // Idempotency
        const msgRef = collection(db, 'promed_passengers', patientId, 'messages');
        const qMsg = query(msgRef, where("telegramMessageId", "==", message.message_id));
        const existingMsg = await getDocs(qMsg);

        if (!existingMsg.empty) return;

        await addDoc(msgRef, {
            text: textContent,
            sender: 'user',
            image: imageUrl,
            voice: voiceUrl,
            createdAt: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            telegramMessageId: message.message_id
        });
        console.log(`✅ Message from ${patientId} saved to Dashboard: "${textContent.substring(0, 20)}..."`);

        console.log(`✅ Incoming saved: ${patientData.fullName}`);
    } catch (error) {
        console.error(error);
    }
});

// --- REMINDER HELPERS ---
async function runReminderLogic(daysOffset = 1, ctx = null) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const mode = daysOffset === 0 ? "TODAY" : "TOMORROW";
    console.log(`Checking [${mode}] ${targetDateStr}`);

    const patientsRef = collection(db, 'patients');
    const snapshot = await getDocs(patientsRef);
    let count = 0;

    snapshot.forEach(docSnap => {
        const patient = docSnap.data();
        if (patient.telegramChatId && patient.injections && Array.isArray(patient.injections)) {
            const injectionDue = patient.injections.find(inj =>
                inj.status === 'Scheduled' && inj.date && inj.date.startsWith(targetDateStr)
            );

            if (injectionDue) {
                const lang = patient.botLanguage || 'uz';
                const chatId = patient.telegramChatId;
                const name = patient.fullName || "Patient";
                let time = "09:00";
                if (injectionDue.date.includes('T')) time = injectionDue.date.split('T')[1].substring(0, 5);
                const d = new Date(injectionDue.date.split('T')[0]);
                const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                bot.telegram.sendMessage(chatId,
                    `${TEXTS[lang].reminder_title}\n\n${TEXTS[lang].injection_msg(name, dateDisplay, time)}`
                ).catch(e => console.error(e));
                count++;
            }
        }
    });

    if (ctx) ctx.reply(`Sent ${count} (${mode})`);
}

// --- CLEANUP CRON (Maintain DB Health) ---
async function cleanupOldTasks() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const cutoff = yesterday.toISOString();

        const q = query(collection(db, 'outbound_tasks'),
            where('createdAt', '<', cutoff)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        console.log(`🧹 Cleaning up ${snapshot.size} old tasks...`);
        let batchCount = 0;

        // Batch delete (chunking if needed, but keeping it simple for now)
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            // Only delete completed terminal states
            if (['SENT', 'FAILED', 'EDITED', 'DELETED'].includes(data.status)) {
                await deleteDoc(doc.ref); // Individual delete to avoid batch limits for now
                batchCount++;
            }
        }
        console.log(`✅ Cleanup complete: Deleted ${batchCount} tasks.`);
    } catch (e) {
        console.error("Cleanup Error:", e);
    }
}

// Schedule Cleanup at 3 AM daily
cron.schedule('0 3 * * *', cleanupOldTasks);

bot.command('forcereminders', (ctx) => runReminderLogic(1, ctx));
bot.command('forcetoday', (ctx) => runReminderLogic(0, ctx));
bot.command('forcecleanup', (ctx) => cleanupOldTasks().then(() => ctx.reply("Cleanup done.")));

let snapshot_logged = false;

// --- POLLING WORKER ---
async function processOutboundQueue() {
    try {
        const allTasks = await getDocs(collection(db, 'outbound_tasks'));
        if (allTasks.size > 0) {
            console.log(`📡 Queue Review: ${allTasks.size} tasks total.`);
            allTasks.forEach(d => {
                const data = d.data();
                console.log(`  🔍 [${d.id}] Status: ${data.status} | To: ${data.telegramChatId || 'MISSING'} | Text: "${data.text?.substring(0, 15)}..." | Image: ${data.imageUrl ? 'YES' : 'NO'}`);
            });
        }

        const q = query(collection(db, 'outbound_tasks'),
            where('status', '==', 'PENDING')
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        console.log(`📦 Found ${snapshot.size} pending tasks in queue.`);

        const sortedDocs = snapshot.docs.sort((a, b) => {
            const dateA = a.data().createdAt || '';
            const dateB = b.data().createdAt || '';
            return dateA.localeCompare(dateB);
        });

        for (const docSnap of sortedDocs) {
            const docId = docSnap.id;
            const data = docSnap.data();

            try {
                await runTransaction(db, async (transaction) => {
                    const freshRef = doc(db, 'outbound_tasks', docId);
                    const freshDoc = await transaction.get(freshRef);
                    if (!freshDoc.exists()) throw "Gone";
                    if (freshDoc.data().status !== 'PENDING') throw "Taken";
                    transaction.update(freshRef, { status: 'PROCESSING' });
                });
            } catch (e) {
                continue;
            }

            console.log(`🔒 Processing task: ${docId}, Action: ${data.action || 'SEND'}`);
            const { telegramChatId, text, imageUrl, voiceUrl, action, telegramMessageId, originalMessageId, patientId } = data;

            try {
                if (action === 'DELETE') {
                    if (telegramMessageId) {
                        try {
                            await bot.telegram.deleteMessage(telegramChatId, telegramMessageId);
                            console.log(`Deleted ${telegramMessageId}`);
                        } catch (e) { console.error(`Delete warning: ${e.message}`); }
                    }
                    await updateDoc(doc(db, 'outbound_tasks', docId), { status: 'DELETED' });
                    continue;
                }

                if (action === 'EDIT') {
                    if (telegramMessageId && text) {
                        try {
                            await bot.telegram.editMessageText(telegramChatId, telegramMessageId, null, text, { parse_mode: 'Markdown' });
                            console.log(`Edited ${telegramMessageId}`);
                        } catch (e) {
                            console.error(`Edit text failed, trying caption: ${e.message}`);
                            try {
                                await bot.telegram.editMessageCaption(telegramChatId, telegramMessageId, null, text, { parse_mode: 'Markdown' });
                            } catch (e2) { console.error(`Caption failed too`); }
                        }
                    }
                    await updateDoc(doc(db, 'outbound_tasks', docId), { status: 'EDITED' });
                    continue;
                }

                if (!text && !imageUrl && !voiceUrl) {
                    await updateDoc(doc(db, 'outbound_tasks', docId), { status: 'FAILED', error: 'No content' });
                    continue;
                }

                let newTgId;
                if (imageUrl) {
                    try {
                        console.log(`📸 Sending photo to ${telegramChatId}: ${imageUrl}`);
                        const sent = await bot.telegram.sendPhoto(telegramChatId, imageUrl, {
                            caption: text || "",
                            parse_mode: 'Markdown'
                        });
                        newTgId = sent.message_id;
                    } catch (e) {
                        console.error(`❌ Photo failed, trying plain text: ${e.message}`);
                        const sent = await bot.telegram.sendPhoto(telegramChatId, imageUrl, {
                            caption: text || ""
                        });
                        newTgId = sent.message_id;
                    }
                } else if (voiceUrl) {
                    try {
                        console.log(`🎤 Sending voice message to ${telegramChatId}: ${voiceUrl}`);
                        const sent = await bot.telegram.sendVoice(telegramChatId, voiceUrl);
                        newTgId = sent.message_id;
                    } catch (e) {
                        console.error(`❌ Voice send failed: ${e.message}`);
                    }
                } else if (text) {
                    console.log(`💬 Sending text to ${telegramChatId}: "${text.substring(0, 20)}..."`);
                    try {
                        const sent = await bot.telegram.sendMessage(telegramChatId, text, { parse_mode: 'Markdown' });
                        newTgId = sent.message_id;
                    } catch (mdError) {
                        console.warn(`⚠️ Markdown failed for message, retrying with plain text: ${mdError.message}`);
                        const sent = await bot.telegram.sendMessage(telegramChatId, text);
                        newTgId = sent.message_id;
                    }
                }

                if (!newTgId) {
                    await updateDoc(doc(db, 'outbound_tasks', docId), { status: 'FAILED', error: 'Failed to send message' });
                    continue;
                }

                await updateDoc(doc(db, 'outbound_tasks', docId), {
                    status: 'delivered',
                    sentAt: new Date().toISOString(),
                    telegramMessageId: newTgId
                });

                // SYNC DELIVERED STATUS TO DASHBOARD MESSAGE
                if (patientId && originalMessageId) {
                    try {
                        const originalMsgRef = doc(db, 'patients', patientId, 'messages', originalMessageId);
                        await updateDoc(originalMsgRef, { status: 'delivered' });
                        console.log(`✅ Synced 'delivered' status to patient message: ${originalMessageId}`);
                    } catch (syncErr) {
                        console.error(`⚠️ Failed to sync delivered status: ${syncErr.message}`);
                    }
                }

                if (originalMessageId && patientId) {
                    try {
                        await updateDoc(doc(db, 'promed_passengers', patientId, 'messages', originalMessageId), {
                            telegramMessageId: newTgId,
                            status: 'delivered'
                        });
                        console.log(`✅ LINKED Telegram ID ${newTgId} and set delivered.`);
                    } catch (linkErr) {
                        console.error(`❌ LINK FAILED: ${linkErr.message}`);
                    }
                } else {
                    console.warn(`⚠️ SKIPPING LINK: Missing IDs`);
                }
                console.log(`✅ Sent: ${newTgId}`);

            } catch (err) {
                console.error(`❌ Task failed ${docId}:`, err.message);
                await updateDoc(doc(db, 'outbound_tasks', docId), { status: 'FAILED', error: err.message });
            }
        }
    } catch (e) {
        console.error("Polling Loop Error:", e);
    }
}

function startPollLoop() {
    console.log("🔄 Polling started (3s)...");
    setInterval(processOutboundQueue, 3000);
}

// --- CRON ---
cron.schedule('0 6 * * *', () => runReminderLogic(0));
cron.schedule('0 9 * * *', () => runReminderLogic(1));

authenticateBot().then(() => {
    startPollLoop();
    bot.launch({ dropPendingUpdates: true }).then(() => {
        console.log('🤖 Bot launched.');

        // --- SYNC DOCTOR TYPING STATUS -> TELEGRAM ---
        onSnapshot(query(collection(db, 'patients'), where('doctorIsTyping', '==', true)), (snapshot) => {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.telegramChatId) {
                    bot.telegram.sendChatAction(data.telegramChatId, 'typing').catch(() => { });
                }
            });
        });
    }).catch(e => console.error('Launch failed:', e));
});

process.once('SIGINT', () => {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    bot.stop('SIGTERM');
});
