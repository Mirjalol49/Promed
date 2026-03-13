
const admin = require("firebase-admin");
const { Telegraf, Markup } = require("telegraf");
const fs = require('fs');

// --- SERVICE ACCOUNT ---
// Try to load serviceAccountKey.json if it exists
let serviceAccount;
try {
    serviceAccount = require("./serviceAccountKey.json");
    console.log("✅ serviceAccountKey.json found!");
} catch (e) {
    console.warn("⚠️ serviceAccountKey.json NOT found. Trying default credentials...");
}

// Initialize Admin
if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    admin.initializeApp({
        projectId: 'graft-dashboard'
    });
}

const db = admin.firestore();

// LOGGING HELPER
const logStream = fs.createWriteStream('bot-debug.log', { flags: 'a' });
const fileLog = (msg) => {
    const logLine = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    logStream.write(logLine);
};

// CONNECTION TEST
fileLog("🔍 Testing Firestore Connection...");
db.collection('patients').limit(1).get()
    .then(() => fileLog("✅ Firestore Connection SUCCESS!"))
    .catch(e => fileLog(`❌ Firestore Connection FAILED: ${e.message}`));

// --- CONFIGURATION ---
const BOT_TOKEN = '8591992335:AAHzpuGzTHGvEHZgiQuH1-SgEZsf3l9w_GQ';

// --- LOCALIZATION ---
const TEXTS = {
    uz: {
        welcome: "👋 Assalomu alaykum! Muloqot tilini tanlang:",
        ask_contact: "⬇️ Telefon raqamingizni yuborish uchun pastdagi tugmani bosing:",
        share_contact_btn: "📱 Raqamni yuborish",
        searching: "🔎 Tekshirilmoqda...",
        not_found: "❌ Kechirasiz, raqamingiz tizimda topilmadi. Administratorga murojaat qiling.",
        success: (name) => `✅ Assalomu alaykum, **${name}**! Graft dasturiga xush kelibsiz! 🚀\n\nSizning muolajalaringiz nazorat ostida.`,
        reminder_title: "🔔 Eslatma!",
        injection_msg: (name, date, time) => `Hurmatli **${name}**!\n\nErtaga inyeksiya olishingiz kerak:\n🗓 Sana: **${date}**\n⏰ Vaqt: **${time}**\n\nKechikmasdan kelishingizni so'raymiz! 🏥`,
        check_btn: "📅 Jadvalni ko'rish",
        schedule_header: (name) => `👤 **Bemor:** ${name}\n\n📋 **Sizning Inyeksiya Jadvalingiz:**\n\n`,
        schedule_item: (date, time) => `🗓 **Sana:** ${date}\n⏰ **Vaqt:** ${time}\n`,
        schedule_footer: "\nKlinikamizga kech qolmasdan kelishingizni so'raymiz. O'zingizni asrang! 😊",
        no_injection_found: (name) => `👤 **${name}**\n\nSizda rejalashtirilgan inyeksiyalar yo'q. 😊`
    },
    ru: {
        welcome: "👋 Здравствуйте! Выберите язык:",
        ask_contact: "⬇️ Нажмите кнопку ниже, чтобы отправить номер:",
        share_contact_btn: "📱 Отправить номер",
        searching: "🔎 Проверка...",
        not_found: "❌ Номер не найден. Обратитесь к администратору.",
        success: (name) => `✅ Здравствуйте, **${name}**! Добро пожаловать в Graft! 🚀\n\nВаши процедуры под контролем.`,
        reminder_title: "🔔 Напоминание!",
        injection_msg: (name, date, time) => `Уважаемый(ая) **${name}**!\n\nЗавтра у вас инъекция:\n🗓 Дата: **${date}**\n⏰ Время: **${time}**\n\nПожалуйста, не опаздывайте! 🏥`,
        check_btn: "📅 Проверить график",
        schedule_header: (name) => `👤 **Пациент:** ${name}\n\n📋 **Ваш График Инъекций:**\n\n`,
        schedule_item: (date, time) => `🗓 **Дата:** ${date}\n⏰ **Время:** ${time}\n`,
        schedule_footer: "\nПожалуйста, приходите в клинику вовремя. Берегите себя! 😊",
        no_injection_found: (name) => `👤 **${name}**\n\nУ вас нет запланированных инъекций. 😊`
    },
    en: {
        welcome: "👋 Hello! Select language:",
        ask_contact: "⬇️ Press the button below to share your number:",
        share_contact_btn: "📱 Share Number",
        searching: "🔎 Checking...",
        not_found: "❌ Number not found. Contact admin.",
        success: (name) => `✅ Hello, **${name}**! Welcome to Graft! 🚀\n\nYour treatments are under control.`,
        reminder_title: "🔔 Reminder!",
        injection_msg: (name, date, time) => `Dear **${name}**!\n\nYou have an injection scheduled for tomorrow:\n🗓 Date: **${date}**\n⏰ Time: **${time}**\n\nPlease don't be late! 🏥`,
        check_btn: "📅 Check Schedule",
        schedule_header: (name) => `👤 **Patient:** ${name}\n\n📋 **Your Injection Schedule:**\n\n`,
        schedule_item: (date, time) => `🗓 **Date:** ${date}\n⏰ **Time:** ${time}\n`,
        schedule_footer: "\nPlease arrive on time. Take care of yourself! 😊",
        no_injection_found: (name) => `👤 **${name}**\n\nYou have no scheduled injections. 😊`
    }
};

const bot = new Telegraf(BOT_TOKEN);

// --- SECURITY ---
const ALLOWED_USER_IDS = [1907166652, 123456789];
const SCAM_REGEX = /(tonplay|free\s*spin|bonus\s*\d+|crypto\s*giveaway|bitcoin|usdt|invest|airdrop|http.*telegram\.me|http.*t\.me|http.*whatsapp|click\s*here|virus)/i;
const DANGEROUS_EXTENSIONS = /\.(exe|bat|cmd|vbs|vbe|js|jse|wsf|wsh|msc|scr|reg|pif|apk|dll|msi)$/i;

bot.use(async (ctx, next) => {
    const user = ctx.from;
    if (!user) return next();

    // Block common scam vector: forwarded messages from unknown channels
    if (ctx.message && ctx.message.forward_from_chat) {
        try { await ctx.deleteMessage(); } catch (e) { }
        return;
    }

    const message = ctx.message || ctx.editedMessage;
    if (!message) return next();

    // 1. Text Scam / Phishing Detection
    const content = (message.text || "") + (message.caption || "");
    if (SCAM_REGEX.test(content)) {
        console.log(`🛡️ Scam detected and blocked from ${user.first_name} (${user.id})`);
        try {
            await ctx.deleteMessage();
            if (ctx.chat.type !== 'private') await ctx.banChatMember(message.from.id);
        } catch (e) { console.error(e); }
        return;
    }

    // 2. Malware & Virus Document Block
    if (message.document) {
        const fileName = message.document.file_name || "";
        if (DANGEROUS_EXTENSIONS.test(fileName)) {
            fileLog(`☢️ VIRUS/MALWARE BLOCK: Prevented malicious file upload => ${fileName}`);
            try {
                await ctx.deleteMessage();
                await ctx.reply("❌ Xavfsizlik qoidalari: Zararli fayllar yuborish qat'iyan man etiladi! \n\n(Security Alert: Malicious file types are strictly blocked.)");
            } catch (e) { console.error(e); }
            return;
        }
    }

    await next();
});

async function checkSchedule(ctx) {
    const userId = ctx.from.id.toString();
    try {
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where("telegramChatId", "==", userId).limit(1).get();
        if (snapshot.empty) return ctx.reply("❌ Profil topilmadi / Profile not found.");

        const patient = snapshot.docs[0].data();
        const lang = patient.botLanguage || 'uz';
        const name = patient.full_name || patient.fullName || patient.name || "Bemor";

        if (patient.injections && Array.isArray(patient.injections)) {
            const now = new Date();
            const nowStr = now.toISOString().split('T')[0];

            const upcoming = patient.injections
                .filter(inj => inj.status === 'Scheduled' && inj.date >= nowStr)
                .sort((a, b) => a.date.localeCompare(b.date));

            if (upcoming.length > 0) {
                let msg = TEXTS[lang].schedule_header(name);
                upcoming.forEach(inj => {
                    let time = "09:00";
                    if (inj.date.includes('T')) time = inj.date.split('T')[1].substring(0, 5); // HH:mm
                    const d = new Date(inj.date.split('T')[0]);
                    const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                    msg += TEXTS[lang].schedule_item(dateDisplay, time) + "\n";
                });
                msg += TEXTS[lang].schedule_footer;
                ctx.reply(msg, { parse_mode: 'Markdown' });
            } else {
                ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
            }
        } else {
            ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error("Check Schedule Error:", error);
    }
}

bot.hears([TEXTS.uz.check_btn, TEXTS.ru.check_btn, TEXTS.en.check_btn], (ctx) => checkSchedule(ctx));

// --- INCOMING MESSAGE HANDLER ---
bot.on(['text', 'photo', 'voice'], async (ctx) => {
    // Ignore commands or if processed by other handlers
    if (ctx.message.text && (ctx.message.text.startsWith('/') || Object.values(TEXTS).some(t => t.check_btn === ctx.message.text))) {
        return;
    }

    const userId = ctx.from.id.toString();
    fileLog(`📩 Incoming message from ${userId}`);

    try {
        const patientsRef = db.collection('patients');

        // 1. Try String ID ( Most likely)
        let snapshot = await patientsRef.where("telegramChatId", "==", userId).limit(1).get();

        // 2. Fallback: Try Number ID
        if (snapshot.empty) {
            snapshot = await patientsRef.where("telegramChatId", "==", Number(userId)).limit(1).get();
        }

        if (snapshot.empty) {
            fileLog(`❌ Patient not found for Telegram ID: ${userId} (Bot might not represent real user)`);
            return;
        }

        const patientDoc = snapshot.docs[0];
        const patientData = patientDoc.data();

        const now = new Date();
        const messageData = {
            sender: 'user', // From Patient
            createdAt: now.toISOString(),
            time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            telegramMessageId: ctx.message.message_id,
            seen: false
        };

        if (ctx.message.text) {
            messageData.text = ctx.message.text;
            console.log("📝 Text:", messageData.text);
        } else if (ctx.message.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);
            messageData.image = fileLink.href;
            messageData.text = ctx.message.caption || "";
            console.log("🖼 Photo Link:", messageData.image);
        } else if (ctx.message.voice) {
            const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
            messageData.voice = fileLink.href;
            console.log("🎤 Voice Link:", messageData.voice);
        }

        // 1. Save to Messages Subcollection
        await patientDoc.ref.collection('messages').add(messageData);
        fileLog("✅ Message saved to Firestore!");

        // 2. Update Patient Last Message
        let lastMsgPreview = messageData.text;
        if (!lastMsgPreview) {
            if (messageData.image) lastMsgPreview = "🖼 Photo";
            if (messageData.voice) lastMsgPreview = "🎤 Voice";
        }

        await patientDoc.ref.update({
            lastMessage: lastMsgPreview,
            lastMessageTime: messageData.time,
            unreadCount: admin.firestore.FieldValue.increment(1),
            userIsTyping: false
        });

    } catch (e) {
        console.error("Error syncing message:", e);
    }
});

// START
console.log("🚀 Starting Local Bot Polling...");
bot.telegram.deleteWebhook().then(() => {
    bot.launch(() => {
        console.log("🤖 Bot is live!");
    });
}).catch(e => console.error("Failed to delete webhook:", e));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
