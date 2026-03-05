
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { Telegraf, Markup } = require("telegraf");
// const OpenAI = require("openai");
const fs = require("fs");
const os = require("os");
const path = require("path");

admin.initializeApp();
const db = admin.firestore();


// --- CONFIGURATION ---
const BOT_TOKEN = '8591992335:AAHzpuGzTHGvEHZgiQuH1-SgEZsf3l9w_GQ';
// IMPORTANT: Set this in your environment variables or config
// OpenAI Removed as per user request
// const OpenAI = require("openai");


// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);

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
        no_injection_found: (name) => `👤 **${name}**\n\nYou have no scheduled injections. 😊`,
        media_reject: "📷 Media files are not supported here.\n\nPlease contact the doctor personally to send images or videos.",
        contact_doctor: "📞 Contact Doctor",
        chat_btn: "✍️ Write to Doctor",
        chat_instruction: "📝 You can write your questions or messages here.\n\nPlease use **text only**. The doctor will reply as soon as possible."
    },
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
        no_injection_found: (name) => `👤 **${name}**\n\nSizda rejalashtirilgan inyeksiyalar yo'q. 😊`,
        media_reject: "📷 Bu bot orqali rasm yoki video qabul qilinmaydi.\n\nIltimos, shifokorning shaxsiy profiliga yuboring.",
        contact_doctor: "📞 Shifokor bilan bog'lanish",
        chat_btn: "✍️ Shifokorga yozish",
        chat_instruction: "📝 Savollaringiz yoki xabaringizni shu yerda yozib qoldirishingiz mumkin.\n\nIltimos, faqat **matn** shaklida yozing. Shifokor tez orada javob beradi."
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
        no_injection_found: (name) => `👤 **${name}**\n\nУ вас нет запланированных инъекций. 😊`,
        media_reject: "📷 Бот не поддерживает фото и видео.\n\nПожалуйста, отправьте их лично врачу.",
        contact_doctor: "📞 Связаться с врачом",
        chat_btn: "✍️ Написать врачу",
        chat_instruction: "📝 Вы можете написать свои вопросы или сообщения здесь.\n\nПожалуйста, используйте только **текст**. Врач ответит в ближайшее время."
    }
};

const DOCTOR_PHONE_DEFAULT = "+998901234567"; // Fallback

async function getDoctorInfo(patientData) {
    try {
        const extract = (data) => {
            let phone = data.phone || data.phoneNumber;
            // Legacy Promed email-based phone extraction
            if (data.email && data.email.endsWith('@promed.sys')) {
                phone = '+' + data.email.replace('@promed.sys', '');
            }
            return {
                phone: phone || DOCTOR_PHONE_DEFAULT,
                username: data.telegramUsername || data.username || null
            };
        };

        const accountId = patientData.account_id || patientData.accountId;

        if (accountId) {
            // 1. Find ADMIN for this specific Account
            let snapshot = await db.collection('profiles')
                .where('account_id', '==', accountId)
                .where('role', '==', 'admin')
                .limit(1)
                .get();

            if (!snapshot.empty) return extract(snapshot.docs[0].data());

            // 2. Find DOCTOR for this specific Account
            snapshot = await db.collection('profiles')
                .where('account_id', '==', accountId)
                .where('role', '==', 'doctor')
                .limit(1)
                .get();

            if (!snapshot.empty) return extract(snapshot.docs[0].data());
        }

        // FALLBACK (Global Search - ONLY if no accountId match)
        console.warn(`⚠️ No account-specific doctor found for Patient. AccountID: ${accountId}. using Global Fallback.`);

        let snapshot = await db.collection('profiles')
            .where('role', '==', 'admin')
            .limit(1)
            .get();

        if (!snapshot.empty) return extract(snapshot.docs[0].data());

        return { phone: DOCTOR_PHONE_DEFAULT, username: null };
    } catch (error) {
        console.error("Error fetching doctor info:", error);
        return { phone: DOCTOR_PHONE_DEFAULT, username: null };
    }
}


// 1. WHITELIST: Only these User IDs can interact with the bot.
const ALLOWED_USER_IDS = [
    1907166652, // Authorized: User provided ID
    123456789, // Placeholder
];

// 2. BLACKLIST: Instant delete patterns for known scams
const SCAM_REGEX = /(tonplay|free\s*spin|bonus\s*\d+|crypto\s*giveaway)/i;

// --- SECURITY MIDDLEWARE ---

// Layer 1: Global Firewall (Access Control)
bot.use(async (ctx, next) => {
    const user = ctx.from;
    if (!user) return next();

    // LOGGING (Cloud Logs)
    console.log(`🛡️ Access Check: User ${user.first_name || 'Unknown'} (${user.id})`);

    if (ALLOWED_USER_IDS.includes(123456789) && ALLOWED_USER_IDS.length === 1) {
        console.warn("⚠️ WARNING: Whitelist is using placeholder.");
    }

    // WHITELIST DISABLED FOR PUBLIC ACCESS
    // if (!ALLOWED_USER_IDS.includes(user.id)) {
    //    console.warn(`⛔ BLOCKED UNAUTHORIZED ACCESS: User ${user.id}`);
    //    return; // Silent drop
    // }
    console.log(`🌍 Public Access: User ${user.first_name || 'Unknown'} (${user.id})`);

    await next();
});

// Layer 2: Anti-Spam Scanner (Content Filter)
bot.use(async (ctx, next) => {
    const message = ctx.message || ctx.editedMessage;
    if (!message) return next();

    const content = (message.text || "") + (message.caption || "");

    if (SCAM_REGEX.test(content)) {
        console.error(`🚩 SCAM DETECTED from allowed user ${message.from.id}!`);
        try {
            await ctx.deleteMessage();
            if (ctx.chat.type !== 'private') {
                await ctx.banChatMember(message.from.id);
            }
        } catch (e) {
            console.error(`Failed to ban/delete: ${e.message}`);
        }
        return;
    }

    await next();
});

// --- OTP AUTH FUNCTIONS ---

// 1. Request OTP
exports.requestOtp = onCall({ cors: true }, async (request) => {
    const { phoneNumber } = request.data;
    if (!phoneNumber) {
        throw new HttpsError('invalid-argument', 'Phone number is required');
    }

    // Normalize phone (remove spaces, etc)
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    let formattedPhone = cleanPhone;

    // Try to construct the formatted version common in DB (+998 90 123 45 67)
    if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
        const country = cleanPhone.substring(0, 4);
        const code = cleanPhone.substring(4, 6);
        const part1 = cleanPhone.substring(6, 9);
        const part2 = cleanPhone.substring(9, 11);
        const part3 = cleanPhone.substring(11, 13);
        formattedPhone = `${country} ${code} ${part1} ${part2} ${part3}`;
    }

    // Find user by Phone (Try clean first, then formatted)
    const usersRef = db.collection('users');
    let usersSnap = await usersRef.where('phoneNumber', '==', cleanPhone).limit(1).get();

    if (usersSnap.empty) {
        // Try formatted version
        usersSnap = await usersRef.where('phoneNumber', '==', formattedPhone).limit(1).get();
    }



    // Fallback: Check 'profiles' collection if not found in 'users'
    let collectionName = 'users';
    if (usersSnap.empty) {
        const profilesRef = db.collection('profiles');
        usersSnap = await profilesRef.where('phoneNumber', '==', cleanPhone).limit(1).get();
        if (usersSnap.empty) {
            usersSnap = await profilesRef.where('phoneNumber', '==', formattedPhone).limit(1).get();
        }
        if (!usersSnap.empty) collectionName = 'profiles';
    }

    if (usersSnap.empty) {
        throw new HttpsError('not-found', 'User not found with this phone number.');
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();

    if (!userData.telegramChatId) {
        throw new HttpsError('failed-precondition', 'Telegram not linked. Please start the bot and share your contact first.');
    }

    // Generate 6-digit Code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    // Save Code under {collection}/{id}/private/otp
    await db.collection(collectionName).doc(userDoc.id).collection('private').doc('otp').set({
        code: otpCode,
        expiresAt: expiresAt
    });

    // Send via Telegram
    try {
        await bot.telegram.sendMessage(userData.telegramChatId, `🔐 *Promed Login Code:* ${otpCode}\n\nDo not share this with anyone.`, { parse_mode: 'Markdown' });
        return { success: true, message: 'OTP sent to Telegram' };
    } catch (e) {
        console.error("Telegram Send Error:", e);
        throw new HttpsError('internal', 'Failed to send Telegram message.');
    }
});

// 2. Verify OTP
exports.verifyOtp = onCall({ cors: true }, async (request) => {
    const { phoneNumber, code } = request.data;

    // Normalize phone
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    let formattedPhone = cleanPhone;

    if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
        const country = cleanPhone.substring(0, 4);
        const code = cleanPhone.substring(4, 6);
        const part1 = cleanPhone.substring(6, 9);
        const part2 = cleanPhone.substring(9, 11);
        const part3 = cleanPhone.substring(11, 13);
        formattedPhone = `${country} ${code} ${part1} ${part2} ${part3}`;
    }

    const usersRef = db.collection('users');
    let usersSnap = await usersRef.where('phoneNumber', '==', cleanPhone).limit(1).get();

    if (usersSnap.empty) {
        usersSnap = await usersRef.where('phoneNumber', '==', formattedPhone).limit(1).get();
    }
    // Fallback: Check 'profiles' if not found in 'users'
    if (usersSnap.empty) {
        const profilesRef = db.collection('profiles');
        usersSnap = await profilesRef.where('phoneNumber', '==', cleanPhone).limit(1).get();
        if (usersSnap.empty) {
            usersSnap = await profilesRef.where('phoneNumber', '==', formattedPhone).limit(1).get();
        }
    }

    if (usersSnap.empty) {
        throw new HttpsError('not-found', 'User not found.');
    }

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;
    // Determine collection based on ref parent? No, just try both or assume standard.
    // Actually we need to know where to find the OTP.
    // Let's check 'users' then 'profiles' for the private/otp doc.

    let otpDoc = await db.collection('users').doc(userId).collection('private').doc('otp').get();
    if (!otpDoc.exists) {
        otpDoc = await db.collection('profiles').doc(userId).collection('private').doc('otp').get();
    }

    // Next step is verifying existence
    // Get Stored OTP
    // const otpDoc = await db.collection('users').doc(userId).collection('private').doc('otp').get();
    if (!otpDoc.exists) {
        throw new HttpsError('invalid-argument', 'No OTP request found. Please request a new code.');
    }

    const otpData = otpDoc.data();
    if (Date.now() > otpData.expiresAt) {
        throw new HttpsError('deadline-exceeded', 'OTP expired. Please request a new code.');
    }

    if (otpData.code !== code) {
        throw new HttpsError('invalid-argument', 'Invalid code.');
    }

    // Success! Clear OTP from wherever it was
    try {
        await db.collection('users').doc(userId).collection('private').doc('otp').delete();
    } catch (e) { }
    try {
        await db.collection('profiles').doc(userId).collection('private').doc('otp').delete();
    } catch (e) { }

    // Create Custom Token
    const token = await admin.auth().createCustomToken(userId);
    return { token };
});


// --- BOT LOGIC ---

bot.start((ctx) => {
    ctx.reply(TEXTS.uz.welcome + "\n\n🔄 *Hisobni almashtirish uchun:* /logout", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz')],
            [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
            [Markup.button.callback('🇬🇧 English', 'lang_en')]
        ])
    });
});

// Logout / Reset Command
bot.command('logout', async (ctx) => {
    const userId = ctx.from.id.toString();
    try {
        const batch = db.batch();
        const patients = await db.collection('patients').where('telegramChatId', '==', userId).get();
        const profiles = await db.collection('profiles').where('telegramChatId', '==', userId).get();

        patients.forEach(doc => batch.update(doc.ref, { telegramChatId: admin.firestore.FieldValue.delete() }));
        profiles.forEach(doc => batch.update(doc.ref, { telegramChatId: admin.firestore.FieldValue.delete() }));

        await batch.commit();
        await ctx.reply("🚪 *Profildan chiqildi.*\nEndi tizim sizni tanimaydi. Qaytadan bog'lanish uchun /start ni bosing.", { parse_mode: 'Markdown' });
    } catch (e) {
        console.error("Logout error:", e);
        ctx.reply("❌ Xatolik yuz berdi.");
    }
});

// Join Request Auto-Approve (Keep existing logic)
bot.on('chat_join_request', async (ctx) => {
    const user = ctx.chatJoinRequest.from;
    console.log(`🛡️ Join Request: ${user.first_name} (${user.id})`);
    await ctx.approveChatJoinRequest(user.id);
});

// Language Selection Handlers
['uz', 'ru', 'en'].forEach(lang => {
    bot.action(`lang_${lang}`, async (ctx) => {
        // 1. STOP SPINNER IMMEDIATELY (Fixes "Just Loading" issue)
        try { await ctx.answerCbQuery(); } catch (e) { console.error("CbQuery Error:", e); }

        try {
            const userId = ctx.from.id.toString();
            console.log(`🔘 Language selected: ${lang} by ${userId}`);

            // 2. STORE SESSION IN FIRESTORE (Fixes "Core" Stateless Issue)
            await db.collection('bot_sessions').doc(userId).set({
                lang,
                step: 'contact',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await ctx.reply(TEXTS[lang].ask_contact, Markup.keyboard([
                [{ text: TEXTS[lang].share_contact_btn, request_contact: true }]
            ]).resize().oneTime());
        } catch (e) {
            console.error(`Error in lang_${lang} action:`, e);
        }
    });
});

// Contact Handler (IMPROVED to link USERS too)
bot.on('contact', async (ctx) => {
    const userId = ctx.from.id.toString();
    const contact = ctx.message.contact;

    // 3. RETRIEVE SESSION FROM FIRESTORE
    let lang = 'uz';
    try {
        const sessionDoc = await db.collection('bot_sessions').doc(userId).get();
        if (sessionDoc.exists) {
            lang = sessionDoc.data().lang || 'uz';
        }
    } catch (e) {
        console.error("Session Read Error:", e);
    }

    if (contact.user_id !== ctx.from.id) {
        return ctx.reply("❌ Iltimos, o'zingizning raqamingizni yuboring / Please send your own contact.");
    }

    await ctx.reply(TEXTS[lang].searching, Markup.removeKeyboard());

    try {
        let rawPhone = contact.phone_number;
        if (!rawPhone.startsWith('+')) rawPhone = '+' + rawPhone;

        // Robust normalization: Remove ALL spaces, dashes, parentheses
        const cleanPhone = rawPhone.replace(/[\s\-\(\)]/g, '');

        console.log(`Searching for patient with phone: ${cleanPhone}`);

        // CHECK PATIENTS (Only Patients, No Admin/Staff Linking)
        const variants = [cleanPhone];
        if (cleanPhone.startsWith('+')) variants.push(cleanPhone.substring(1)); // Try without +
        else variants.push('+' + cleanPhone); // Try with +

        // If Uzbek number (+998), try to generate the specific web-app format: "+998 93 748 91 41"
        if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
            const country = cleanPhone.substring(0, 4); // +998
            const code = cleanPhone.substring(4, 6);    // 93
            const part1 = cleanPhone.substring(6, 9);   // 748
            const part2 = cleanPhone.substring(9, 11);  // 91
            const part3 = cleanPhone.substring(11, 13); // 41
            const formatted = `${country} ${code} ${part1} ${part2} ${part3}`;
            variants.push(formatted);
        }

        const patientsRef = db.collection('patients');
        const profilesRef = db.collection('profiles');

        // --- STEP A: CLEANUP OLD LINKS ---
        // Ensure this Telegram ID is not stuck on any old or incorrect records
        const [oldPatients, oldProfiles] = await Promise.all([
            patientsRef.where("telegramChatId", "==", userId).get(),
            profilesRef.where("telegramChatId", "==", userId).get()
        ]);

        if (!oldPatients.empty || !oldProfiles.empty) {
            const cleanupBatch = db.batch();
            oldPatients.forEach(d => cleanupBatch.update(d.ref, { telegramChatId: admin.firestore.FieldValue.delete() }));
            oldProfiles.forEach(d => cleanupBatch.update(d.ref, { telegramChatId: admin.firestore.FieldValue.delete() }));
            await cleanupBatch.commit();
            console.log(`🧹 Cleaned up old links for Telegram ID: ${userId}`);
        }

        // --- STEP B: FIND NEW RECORDS ---
        const [patientSnap, profileSnap] = await Promise.all([
            patientsRef.where("phone", "in", variants).limit(1).get(),
            profilesRef.where("phone", "in", variants).limit(1).get()
        ]);

        if (patientSnap.empty && profileSnap.empty) {
            return ctx.reply(TEXTS[lang].not_found);
        }

        let isLinked = false;

        // Link Patient
        if (!patientSnap.empty) {
            const patientDoc = patientSnap.docs[0];
            const patientData = patientDoc.data();
            await patientDoc.ref.update({
                telegramChatId: userId.toString(),
                botLanguage: lang
            });
            isLinked = true;

            const pName = patientData.fullName || patientData.name || patientData.full_name || "Bemor";
            await ctx.reply(`✅ Bemorni (Patient) profili bog'landi: **${pName}**`, { parse_mode: 'Markdown' });
        }

        // Link Staff/Admin (Professional Fallback support)
        if (!profileSnap.empty) {
            const profileDoc = profileSnap.docs[0];
            const profileData = profileDoc.data();
            await profileDoc.ref.update({
                telegramChatId: userId.toString(),
                botLanguage: lang
            });
            isLinked = true;

            const sName = profileData.fullName || profileData.name || profileData.full_name || "Xodim";
            await ctx.reply(`✅ Xodim (Staff/Admin) profili bog'landi: **${sName}**`, { parse_mode: 'Markdown' });
        }

        if (isLinked) {
            await ctx.reply(TEXTS[lang].success(''), { parse_mode: 'Markdown' });
            await ctx.reply("👇", Markup.keyboard([
                [TEXTS[lang].check_btn],
                [TEXTS[lang].chat_btn]
            ]).resize());
        }

    } catch (error) {
        console.error("Error during verification:", error);
        ctx.reply("⚠️ Tizim xatosi. Keyinroq urinib ko'ring.");
    }
});

// Helper for Check Schedule (Updated to show List)
async function checkSchedule(ctx) {
    const userId = ctx.from.id.toString();
    try {
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where("telegramChatId", "==", userId).limit(1).get();
        if (snapshot.empty) return ctx.reply("❌ Profil topilmadi / Profile not found.");

        const patient = snapshot.docs[0].data();
        const lang = patient.botLanguage || 'uz';
        // Robust Name Extraction
        const name = patient.fullName || patient.name || patient.full_name ||
            (patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : "Bemor");

        if (patient.injections && Array.isArray(patient.injections)) {
            const now = new Date();
            const nowStr = now.toISOString().split('T')[0];

            // Filter for future scheduled injections
            const upcoming = patient.injections
                .filter(inj => inj.status === 'Scheduled' && inj.date >= nowStr) // Only future or today
                .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

            if (upcoming.length > 0) {
                let msg = TEXTS[lang].schedule_header(name);

                upcoming.forEach(inj => {
                    let time = "09:00";
                    if (inj.date.includes('T')) time = inj.date.split('T')[1].substring(0, 5);

                    // Format Date: DD.MM.YYYY
                    const d = new Date(inj.date.split('T')[0]);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const dateDisplay = `${day}.${month}.${year}`;

                    // Cleaner Format: 📅 10.05.2024   ⏰ 09:00
                    // msg += `📅 ${dateDisplay}   ⏰ ${time}\n`; // OLD

                    // Multi-line Format (Requested)
                    msg += TEXTS[lang].schedule_item(dateDisplay, time) + "\n";
                });

                // Add Footer
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
        ctx.reply("⚠️ Error checking schedule.");
    }
}

// Handlers for Check Schedule Button (All languages)
bot.hears([TEXTS.uz.check_btn, TEXTS.ru.check_btn, TEXTS.en.check_btn], (ctx) => checkSchedule(ctx));


// Handlers for Chat Button (New)
bot.hears([TEXTS.uz.chat_btn, TEXTS.ru.chat_btn, TEXTS.en.chat_btn], async (ctx) => {
    const userId = ctx.from.id.toString();
    let lang = 'uz';
    try {
        const sessionDoc = await db.collection('bot_sessions').doc(userId).get();
        if (sessionDoc.exists) lang = sessionDoc.data().lang || 'uz';
    } catch (e) { }

    ctx.reply(TEXTS[lang].chat_instruction, { parse_mode: 'Markdown' });
});

// --- INCOMING MESSAGE HANDLER (SYNC TO FIRESTORE) ---
// --- MEDIA HANDLER (Reject & Redirect) ---
bot.on(['photo', 'video', 'voice', 'video_note', 'document', 'sticker'], async (ctx) => {
    const userId = ctx.from.id.toString();

    // 1. Get Language
    let lang = 'uz';
    try {
        const sessionDoc = await db.collection('bot_sessions').doc(userId).get();
        if (sessionDoc.exists) {
            lang = sessionDoc.data().lang || 'uz';
        }
    } catch (e) { console.error(e); }

    // 2. Resolve Patient Context (to find correct Doctor)
    let patientData = {};
    try {
        const patientsRef = db.collection('patients');
        // Try String ID
        let snapshot = await patientsRef.where("telegramChatId", "==", userId).limit(1).get();
        // Fallback: Try Number ID
        if (snapshot.empty) {
            snapshot = await patientsRef.where("telegramChatId", "==", Number(userId)).limit(1).get();
        }

        if (!snapshot.empty) {
            patientData = snapshot.docs[0].data();
        }
    } catch (e) {
        console.error("Error resolving patient context:", e);
    }

    // 3. Refresh Doctor Info dynamically
    const { phone, username } = await getDoctorInfo(patientData);

    let contactUrl = '';
    if (username) {
        // Use Username if available (Most Reliable)
        contactUrl = `https://t.me/${username.replace('@', '')}`;
    } else {
        // Use Phone Number with + prefix (Reliable for linking)
        const cleanPhone = phone.replace(/[^\d]/g, '');
        contactUrl = `https://t.me/+${cleanPhone}`;
    }

    // 4. Reply with Rejection & Contact Button
    await ctx.reply(TEXTS[lang].media_reject, Markup.inlineKeyboard([
        [Markup.button.url(TEXTS[lang].contact_doctor, contactUrl)]
    ]));
});

// --- INCOMING MESSAGE HANDLER (SYNC TO FIRESTORE) ---
bot.on('text', async (ctx) => {
    // Ignore commands or if processed by other handlers
    if (ctx.message.text && (ctx.message.text.startsWith('/') || Object.values(TEXTS).some(t => t.check_btn === ctx.message.text))) {
        return;
    }

    const userId = ctx.from.id.toString();
    try {
        const patientsRef = db.collection('patients');

        // 1. Try String ID
        let snapshot = await patientsRef.where("telegramChatId", "==", userId).limit(1).get();

        // 2. Fallback: Try Number ID
        if (snapshot.empty) {
            snapshot = await patientsRef.where("telegramChatId", "==", Number(userId)).limit(1).get();
        }

        if (snapshot.empty) {
            console.log(`❌ Patient not found for Telegram ID: ${userId}`);
            return;
        }

        const patientDoc = snapshot.docs[0];
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();


        const now = new Date();
        const messageData = {
            sender: 'user', // From Patient
            createdAt: now.toISOString(),
            time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // Force HH:mm
            telegramMessageId: ctx.message.message_id,
            seen: false,
            text: ctx.message.text
        };

        // 1. Save to Messages Subcollection
        await patientDoc.ref.collection('messages').add(messageData);

        // 2. Update Patient Last Message
        await patientDoc.ref.update({
            lastMessage: messageData.text,
            lastMessageTime: messageData.time,
            lastMessageTimestamp: now.toISOString(),
            unreadCount: admin.firestore.FieldValue.increment(1)
        });

        // 3. BROADCAST TO STAFF (MANDATORY FOR iOS LOCKED STATE)
        const accountId = patientData.account_id || patientData.accountId || patientData.staffId;

        let staffTokens = [];
        let staffChatIds = [];
        try {
            // Find tokens for Admins and Doctors belonging to this patient's account
            const tokenSnap = await db.collection('fcmTokens').get();
            const allTokens = tokenSnap.docs.map(t => t.data());

            let staffProfiles = [];
            if (accountId) {
                const staffSnap = await db.collection('profiles')
                    .where('account_id', '==', accountId)
                    .get();
                staffProfiles = staffSnap.docs.map(s => ({ id: s.id, ...s.data() }));
            } else {
                const adminSnap = await db.collection('profiles').where('role', '==', 'admin').get();
                staffProfiles = adminSnap.docs.map(s => ({ id: s.id, ...s.data() }));
            }

            const staffIds = staffProfiles.map(s => s.id);
            staffTokens = allTokens.filter(t => staffIds.includes(t.userId)).map(t => t.token);
            staffChatIds = staffProfiles.filter(s => s.telegramChatId).map(s => s.telegramChatId);

            // 3a. TELEGRAM FALLBACK (100% Reliability)
            if (staffChatIds.length > 0) {
                const pName = patientData.fullName || patientData.name || "Bemor";
                const alertMsg = `📩 *Yangi xabar* (${pName}):\n\n${messageData.text}`;

                for (const chatId of staffChatIds) {
                    try {
                        await bot.telegram.sendMessage(chatId, alertMsg, { parse_mode: 'Markdown' });
                        console.log(`📡 Telegram Fallback sent to staff: ${chatId}`);
                    } catch (tgErr) {
                        console.error(`❌ Telegram Fallback failed for staff ${chatId}:`, tgErr.message);
                    }
                }
            }

            if (staffTokens.length > 0) {
                // CRITICAL PAYLOAD: iOS will ONLY wake a completely closed PWA
                // if BOTH 'notification' and high 'Urgency' webpush headers are provided!
                const fcmMessage = {
                    notification: {
                        title: patientData.fullName || patientData.name || "Bemor",
                        body: messageData.text,
                    },
                    webpush: {
                        headers: {
                            "Urgency": "high"
                        }
                    },
                    data: {
                        patientName: patientData.fullName || patientData.name || "Bemor",
                        patientId: patientId,
                        text: messageData.text,
                        type: "CHAT_MESSAGE"
                    },
                    tokens: staffTokens
                };

                const response = await admin.messaging().sendEachForMulticast(fcmMessage);
                console.log(`✅ FCM Broadcast: Sent to ${response.successCount}/${staffTokens.length} staff devices.`);

                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.log(`❌ FCM Token failure: ${resp.error.message}`);
                        }
                    });
                }
            } else {
                console.log(`ℹ️ No FCM tokens found for staff assigned to patient ${patientId}`);
            }
        } catch (fcmErr) {
            console.error("❌ FCM Broadcast Error:", fcmErr.message);
        }

    } catch (e) {
        console.error("Error syncing message:", e);
    }
});

// --- EXPORTS (V2) ---

// 1. Webhook Handler
exports.botHandler = onRequest({ region: "us-central1" }, async (req, res) => {
    try {
        // Handle Telegran Update
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (e) {
        console.error('Bot Error', e);
        res.status(500).send('Error');
    }
});

// 2. Daily Reminder (Scheduled)
exports.dailyReminder = onSchedule({
    schedule: "0 9 * * *",
    timeZone: "Asia/Tashkent",
    region: "us-central1"
}, async (event) => {
    console.log("Running Daily Reminder Job...");

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        console.log(`Checking reminders for date: ${tomorrowStr}`);

        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.get();

        const promises = [];

        snapshot.forEach(docSnap => {
            const patient = docSnap.data();

            if (patient.telegramChatId && patient.injections && Array.isArray(patient.injections)) {

                // Fix: Check if inj.date starts with tomorrowStr (handles "2024-01-01T09:00:00" vs "2024-01-01")
                const injectionDue = patient.injections.find(inj =>
                    inj.status === 'Scheduled' &&
                    inj.date &&
                    inj.date.startsWith(tomorrowStr)
                );

                if (injectionDue) {
                    const lang = patient.botLanguage || 'uz';
                    const chatId = patient.telegramChatId;
                    const name = patient.fullName || patient.name || patient.full_name || "Patient";

                    // Parse Time if available
                    let time = "09:00"; // Default
                    if (injectionDue.date.includes('T')) {
                        time = injectionDue.date.split('T')[1].substring(0, 5); // HH:mm
                    }

                    console.log(`Sending reminder to ${name} (${chatId})`);

                    // Format Date for display DD.MM.YYYY
                    const d = new Date(tomorrowStr);
                    const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                    const p = bot.telegram.sendMessage(chatId,
                        `${TEXTS[lang].reminder_title}\n\n${TEXTS[lang].injection_msg(name, dateDisplay, time)}`
                    ).catch(e => console.error(`Failed to send to ${chatId}:`, e.message));

                    promises.push(p);
                }
            }
        });

        await Promise.all(promises);
        console.log(`Process Complete. Sent ${promises.length} reminders.`);

    } catch (error) {
        console.error("Reminder Job Error:", error);
    }
});

// 2b. Doctor Evening Reminder — 9 PM night before injection
// Sends in-app notification to all doctors/admins about tomorrow's patients
exports.doctorEveningReminder = onSchedule({
    schedule: "0 21 * * *", // 9:00 PM every day
    timeZone: "Asia/Tashkent",
    region: "us-central1"
}, async (event) => {
    console.log("🌙 Running Doctor Evening Reminder (9 PM)...");

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Format display date: DD.MM.YYYY
        const d = new Date(tomorrowStr);
        const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

        console.log(`📅 Checking injections for: ${tomorrowStr} (${dateDisplay})`);

        // 1. Find all patients with injections tomorrow
        const patientsSnap = await db.collection('patients').get();
        const tomorrowPatients = [];

        patientsSnap.forEach(docSnap => {
            const patient = docSnap.data();
            if (patient.injections && Array.isArray(patient.injections)) {
                const injectionDue = patient.injections.find(inj =>
                    inj.status === 'Scheduled' &&
                    inj.date &&
                    inj.date.startsWith(tomorrowStr)
                );

                if (injectionDue) {
                    let time = "09:00";
                    if (injectionDue.date.includes('T')) {
                        time = injectionDue.date.split('T')[1].substring(0, 5);
                    }

                    tomorrowPatients.push({
                        name: patient.fullName || patient.name || "Bemor",
                        time,
                        accountId: patient.account_id || patient.accountId || null,
                        patientId: docSnap.id,
                        image: patient.profileImage || null
                    });
                }
            }
        });

        if (tomorrowPatients.length === 0) {
            console.log("✅ No injections tomorrow. No reminders needed.");
            return;
        }

        console.log(`📋 Found ${tomorrowPatients.length} patient(s) with injections tomorrow.`);

        // 2. Get all doctor/admin profiles and group them by account
        const profilesSnap = await db.collection('profiles').get();
        const staffByAccount = new Map();

        profilesSnap.forEach(docSnap => {
            const profile = docSnap.data();
            if (profile.role === 'admin' || profile.role === 'doctor') {
                const accId = profile.account_id || profile.accountId || 'MASTER';
                if (!staffByAccount.has(accId)) {
                    staffByAccount.set(accId, []);
                }
                staffByAccount.get(accId).push(docSnap.id);
            }
        });

        if (staffByAccount.size === 0) {
            console.warn("⚠️ No doctor/admin profiles found.");
            return;
        }

        // 3. Create notification content
        const createdAt = new Date().toISOString();
        const batch = db.batch();
        let totalNotifs = 0;

        // 4. Write notification for each patient to relevant doctors/admins
        tomorrowPatients.forEach(p => {
            const title = `💉 Ertaga soat ${p.time}`;
            const patientAccId = p.accountId || 'MASTER';
            const relevantStaff = staffByAccount.get(patientAccId) || [];

            relevantStaff.forEach(userId => {
                const docRef = db.collection('notifications').doc();
                batch.set(docRef, {
                    title: title,
                    content: p.name,
                    type: 'info',
                    category: 'message',
                    userId,
                    is_active: true,
                    is_read: false,
                    created_at: createdAt,
                    viewed_at: null,
                    patientId: p.patientId,
                    patientName: p.name,
                    patientImage: p.image
                });
                totalNotifs++;
            });
        });

        if (totalNotifs > 0) {
            await batch.commit();
            console.log(`✅ Sent ${totalNotifs} evening reminders to relevant staff about ${tomorrowPatients.length} patient(s).`);
        } else {
            console.log("ℹ️ No relevant staff found for any scheduled patients.");
        }

    } catch (error) {
        console.error("❌ Doctor Evening Reminder Error:", error);
    }
});

// 3. Notification Sender (Real-time Firestore Trigger)
// Listens for new documents in 'outbound_messages' and sends them via Telegram.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// --- HELPER: Process Telegram Task (Shared by Trigger & Scheduler) ---
async function processTelegramTask(data, ref) {
    const { telegramChatId, text, patientName, imageUrl, voiceUrl, videoUrl, action, telegramMessageId, replyToMessageId } = data;
    let sentMessageId = null;

    console.log(`📨 Executing task: ${action || 'SEND'} for ${patientName} (${telegramChatId})`);

    try {
        if (action === 'EDIT') {
            if (!telegramMessageId || !text) throw new Error("EDIT requires telegramMessageId and text");
            await bot.telegram.editMessageText(telegramChatId, telegramMessageId, null, text);
            console.log(`✏️ Message edited: ${telegramMessageId}`);
        } else if (action === 'DELETE') {
            if (!telegramMessageId) throw new Error("DELETE requires telegramMessageId");
            await bot.telegram.deleteMessage(telegramChatId, telegramMessageId);
            console.log(`🗑️ Message deleted: ${telegramMessageId}`);
        } else {
            // SEND
            const extra = {};
            if (replyToMessageId) extra.reply_to_message_id = replyToMessageId;

            if (videoUrl) {
                const videoExtra = { ...extra, caption: text || undefined };
                console.log(`📤 Sending Video...`);
                const sent = await bot.telegram.sendVideo(telegramChatId, videoUrl, videoExtra);
                sentMessageId = sent.message_id;
            } else if (imageUrl) {
                const photoExtra = { ...extra, caption: text || undefined };
                console.log(`📤 Sending Photo...`);
                const sent = await bot.telegram.sendPhoto(telegramChatId, imageUrl, photoExtra);
                sentMessageId = sent.message_id;
            } else if (voiceUrl) {
                console.log(`📤 Sending Voice...`);
                const sent = await bot.telegram.sendVoice(telegramChatId, voiceUrl, extra);
                sentMessageId = sent.message_id;
            } else if (text) {
                console.log(`📤 Sending Text...`);
                const sent = await bot.telegram.sendMessage(telegramChatId, text, extra);
                sentMessageId = sent.message_id;
            }
        }

        // Update Status to DELIVERED
        const updateData = {
            status: 'delivered',
            sentAt: new Date().toISOString()
        };
        if (sentMessageId) updateData.telegramMessageId = sentMessageId;

        await ref.update(updateData);

        // SYNC TO PATIENT CHAT (Only for SEND)
        if (!action || action === 'SEND') {
            const { patientId, originalMessageId } = data;
            if (patientId && originalMessageId) {
                try {
                    await db.collection('patients').doc(patientId).collection('messages').doc(originalMessageId).update({
                        status: 'delivered',
                        telegramMessageId: sentMessageId || undefined
                    });
                    console.log(`✅ Synced to patient message: ${originalMessageId}`);
                } catch (e) {
                    console.error("Sync error:", e.message);
                }
            }
        }
        return true;
    } catch (error) {
        console.error(`❌ Task Failed:`, error.message);
        if (action === 'DELETE' && error.message.includes("message to delete not found")) {
            await ref.update({ status: 'delivered', note: 'Already deleted' });
        } else {
            await ref.update({ status: 'FAILED', error: error.message });
        }
        return false;
    }
}

exports.notificationSender = onDocumentCreated({ document: "outbound_messages/{msgId}", region: "us-central1" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    // Only process PENDING messages (Created by App)
    if (data.status !== 'PENDING') return;

    const { scheduledFor, patientName, telegramChatId } = data;

    // Safety check
    if (!telegramChatId) {
        console.error("Missing telegramChatId in outbound message");
        await snapshot.ref.update({ status: 'FAILED', error: "Missing Chat ID" });
        return;
    }

    try {
        // 1. Check Matching Logic
        if (scheduledFor) {
            // PROFESSIONAL FIX: Always queue scheduled messages.
            // We do not send immediately to avoid race conditions or clock skews.
            // The Scheduler (processMessageQueue) is the single source of truth for "Time to Send".
            console.log(`📅 Scheduled Message for ${patientName} detected (${scheduledFor}). Enforcing Queue.`);
            await snapshot.ref.update({ status: 'QUEUED' });
            return;
        }

        // 2. Send Immediately (if no schedule or schedule is now/past)
        await processTelegramTask(data, snapshot.ref);

    } catch (e) {
        console.error(`❌ Critical error in notificationSender:`, e);
        await snapshot.ref.update({ status: 'FAILED', error: e.message });
    }
});

// 4. AI Audio Transcription (HTTPS Callable)
// 4. AI Audio Transcription REMOVED

// --- SYSTEM ADMIN FUNCTIONS ---

/**
 * Provision a new System User (Doctor/Staff/Admin)
 * This handles Auth creation + Firestore Profile + Role assignment
 */
exports.createSystemUser = onCall(async (request) => {
    // 1. Authenticate & Authorize
    const callerId = request.auth?.uid;
    if (!callerId) {
        throw new HttpsError('unauthenticated', 'Endpoint requires authentication.');
    }

    // Verify caller is admin
    const callerDoc = await db.collection('profiles').doc(callerId).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'Restricted to System Administrators.');
    }

    const { email, password, fullName, phoneNumber, role } = request.data;
    const assignedRole = role || 'doctor'; // Default to doctor, NOT admin

    try {
        // 2. Create Authentication User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: fullName,
            emailVerified: true
        });

        // 3. Create Firestore Profile (Public/Visible)
        await db.collection('profiles').doc(userRecord.uid).set({
            fullName,
            email,
            phoneNumber,
            role: assignedRole, // Critical: Use the passed role
            createdAt: new Date().toISOString(),
            isSystemAccount: true,
            status: 'active'
        });

        // 4. Create User Shadow Record (if needed for list queries)
        await db.collection('users').doc(userRecord.uid).set({
            fullName,
            email,
            phoneNumber,
            role: assignedRole,
            createdAt: new Date().toISOString()
        });

        console.log(`✅ System User Created: ${email} (${assignedRole})`);
        return { success: true, userId: userRecord.uid };

    } catch (error) {
        console.error("Create System User Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Completely wipe a user from existence (Auth + DB + Storage + Patient Records + Notes + Leads)
 */
exports.deleteSystemAccount = onCall(async (request) => {
    // 1. Authenticate & Authorize
    const callerId = request.auth?.uid;
    if (!callerId) {
        throw new HttpsError('unauthenticated', 'Endpoint requires authentication.');
    }

    // Verify caller is admin
    const callerDoc = await db.collection('profiles').doc(callerId).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'Restricted to System Administrators.');
    }

    const { targetUserId } = request.data;
    if (!targetUserId) {
        throw new HttpsError('invalid-argument', 'Target User ID is required.');
    }

    console.log(`🚨 STARTING TOTAL SYSTEM WIPE for user: ${targetUserId} by admin: ${callerId}`);

    try {
        const batch = db.batch();

        // 2. Fetch User Profile for Bot Data Cleanup
        const userProfileRef = db.collection('profiles').doc(targetUserId);
        const userProfileSnap = await userProfileRef.get();
        const userData = userProfileSnap.data();

        // 3. Delete Bot "Patient" records
        if (userData && userData.phoneNumber) {
            const cleanPhone = userData.phoneNumber.replace(/\s+/g, '');
            console.log(`🔍 Hunting for patient records with phone: ${cleanPhone}`);

            const variants = [cleanPhone];
            if (cleanPhone.startsWith('+')) variants.push(cleanPhone.substring(1));
            else variants.push('+' + cleanPhone);

            if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
                const country = cleanPhone.substring(0, 4);
                const code = cleanPhone.substring(4, 6);
                const part1 = cleanPhone.substring(6, 9);
                const part2 = cleanPhone.substring(9, 11);
                const part3 = cleanPhone.substring(11, 13);
                variants.push(`${country} ${code} ${part1} ${part2} ${part3}`);
            }

            const patientsRef = db.collection('patients');
            const patientSnap = await patientsRef.where("phone", "in", variants).get();

            if (!patientSnap.empty) {
                patientSnap.forEach(doc => {
                    console.log(`🔥 Deleting linked Patient record: ${doc.id}`);
                    batch.delete(doc.ref);
                });
            } else {
                console.log("ℹ️ No linked patient records found.");
            }
        }

        // 4. Revoke Auth Support
        try {
            await admin.auth().revokeRefreshTokens(targetUserId);
            await admin.auth().deleteUser(targetUserId);
            console.log(`✅ Auth account deleted & tokens revoked for ${targetUserId}`);
        } catch (authErr) {
            if (authErr && authErr.code !== 'auth/user-not-found') {
                console.error("Auth delete error:", authErr);
            }
        }

        // 5. Delete User Data (Notes & Leads - NEW)
        const notesQuery = await db.collection('notes').where('userId', '==', targetUserId).get();
        notesQuery.forEach(doc => batch.delete(doc.ref));
        console.log(`🔥 Queued ${notesQuery.size} notes for deletion`);

        const leadsQuery = await db.collection('leads').where('userId', '==', targetUserId).get();
        leadsQuery.forEach(doc => batch.delete(doc.ref));
        console.log(`🔥 Queued ${leadsQuery.size} leads for deletion`);

        // 6. Delete System Docs
        batch.delete(userProfileRef);
        batch.delete(db.collection('users').doc(targetUserId));

        const notifQuery = await db.collection('notifications').where('userId', '==', targetUserId).get();
        notifQuery.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        console.log(`✅ Firestore All Data Wiped (Profile, User, Patients, Notes, Leads, Notifs)`);

        // 7. Delete Storage
        try {
            const bucket = admin.storage().bucket();
            await bucket.deleteFiles({ prefix: `avatars/${targetUserId}/` });
        } catch (storageErr) {
            console.warn("Storage delete warning:", storageErr.message);
        }

        return { success: true, message: 'User and all associated data (including Notes & Leads) DESTROYED.' };

    } catch (error) {
        console.error("❌ DELETE SYSTEM ACCOUNT ERROR:", error);
        // FORCE SUCCESS for UI to ensure it disappears
        return { success: true, message: 'Forced local removal. System wipe might have partially failed.' };
    }
});

// --- LINK PREVIEW TRIGGER ---
exports.generateLinkPreview = onDocumentWritten("patients/{patientId}/messages/{messageId}", async (event) => {
    if (!event.data) return; // Deleted
    const data = event.data.after.data();
    const previousData = event.data.before.data();

    // Only run if text exists and preview is missing, or text changed
    if (!data || !data.text || data.preview) return;
    if (previousData && previousData.text === data.text && previousData.preview) return;

    // Regex to extract first URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = data.text.match(urlRegex);
    if (!match) return;

    const url = match[0];

    try {
        console.log(`🔍 Fetching preview for: ${url}`);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });

        if (!response.ok) return;

        const html = await response.text();

        // Simple Regex to extract OG tags
        const getMeta = (prop) => {
            const regex = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        const title = getMeta('title') || html.match(/<title>([^<]*)<\/title>/i)?.[1];
        const description = getMeta('description');
        const image = getMeta('image');

        if (title || description || image) {
            await event.data.after.ref.update({
                preview: {
                    url,
                    title: title || "",
                    description: description || "",
                    image: image || ""
                }
            });
            console.log("✅ Preview generated");
        }
    } catch (error) {
        console.error("Failed to generate preview:", error);
    }
});

// --- SCHEDULER: Process Queued Messages ---
// Runs every minute to check for 'QUEUED' messages that are now due.
exports.processMessageQueue = onSchedule({
    schedule: "every 1 minutes",
    timeZone: "Asia/Tashkent",
    region: "us-central1"
}, async (event) => {
    const now = new Date();
    console.log(`⏰ Scheduler tick at ${now.toISOString()} (Tashkent: ${now.toLocaleString('en-GB', { timeZone: 'Asia/Tashkent' })})`);

    try {
        const pendingRef = db.collection('outbound_messages')
            .where('status', '==', 'QUEUED');

        const snapshot = await pendingRef.get();

        if (snapshot.empty) {
            console.log("📭 No QUEUED messages in outbound_messages collection.");
            return;
        }

        console.log(`📋 Found ${snapshot.size} QUEUED message(s). Checking due times...`);

        // Filter in memory: scheduledFor <= now
        const dueDocs = snapshot.docs.filter(doc => {
            const data = doc.data();
            const isDue = data.scheduledFor && data.scheduledFor <= now.toISOString();
            console.log(`   📝 Doc ${doc.id}: scheduledFor=${data.scheduledFor}, due=${isDue}, patient=${data.patientName}`);
            return isDue;
        });

        if (dueDocs.length === 0) {
            console.log(`⏳ ${snapshot.size} QUEUED but none are due yet.`);
            return;
        }

        console.log(`🚀 Found ${dueDocs.length} due messages (out of ${snapshot.size} queued). Sending...`);

        const promises = dueDocs.map(async (docSnap) => {
            const data = docSnap.data();
            const success = await processTelegramTask(data, docSnap.ref);

            // CRITICAL FIX: Also update the patient's message status from 'scheduled' to 'sent'
            if (success && data.patientId && data.originalMessageId) {
                try {
                    const nowTashkent = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tashkent' });
                    // Parse out HH:mm
                    const timePart = nowTashkent.split(', ')[1]?.substring(0, 5) || "";

                    const batch = db.batch();
                    const msgRef = db.collection('patients').doc(data.patientId).collection('messages').doc(data.originalMessageId);
                    const patientRef = db.collection('patients').doc(data.patientId);

                    batch.update(msgRef, {
                        status: 'sent',
                        scheduledFor: null
                    });

                    // Update patient metadata for sorting
                    batch.update(patientRef, {
                        lastMessage: data.text || (data.imageUrl ? "[Rasm]" : data.videoUrl ? "[Video]" : ""),
                        lastMessageTime: timePart,
                        lastMessageTimestamp: new Date().toISOString()
                    });

                    await batch.commit();
                    console.log(`✅ Updated patient message and metadata for ${data.patientId}`);
                } catch (e) {
                    console.error(`⚠️ Failed to update patient message status:`, e.message);
                }
            }
        });

        await Promise.all(promises);
        console.log(`🏁 Batch processing complete.`);
    } catch (e) {
        console.error("❌ Scheduler Error:", e);
    }
});

// --- PWA NATIVE PUSH NOTIFICATION SENDER (MANDATORY FOR iOS LOCKED STATE) ---
// Listens for new docs in 'notifications' (Targeted at UI Users/Admins/Doctors)
exports.sendFCMNotification = onDocumentCreated({ document: "notifications/{notificationId}", region: "us-central1" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { userId, title, content } = data;

    if (!userId) return; // Must have a target user

    try {
        // 1. Resolve User and Telegram ID
        const profileDoc = await db.collection('profiles').doc(userId).get();
        const profileData = profileDoc.exists ? profileDoc.data() : {};
        const staffChatId = profileData.telegramChatId;

        // 3a. TELEGRAM FALLBACK (100% Reliability)
        if (staffChatId) {
            try {
                const alertMsg = `🔔 *Bildirishnoma*:\n\n*${title || "Graft"}*\n${content || ""}`;
                await bot.telegram.sendMessage(staffChatId, alertMsg, { parse_mode: 'Markdown' });
                console.log(`📡 Telegram Notification fallback sent to staff: ${userId}`);
            } catch (tgErr) {
                console.error(`❌ Telegram Notification fallback failed for staff ${userId}:`, tgErr.message);
            }
        }

        // 2. Resolve FCM Token
        const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
        if (!tokenDoc.exists) {
            console.log(`ℹ️ No FCM token found for user ${userId}. PWA Push skipped.`);
            return;
        }

        const tokenData = tokenDoc.data();
        const fcmToken = tokenData.token;
        if (!fcmToken) return;

        const pid = data.patientId || "";
        const customUrl = pid ? `/?patient=${pid}&view=chat` : "/";

        // CRITICAL PAYLOAD: iOS will ONLY wake a completely closed PWA
        const message = {
            token: fcmToken,
            notification: {
                title: title || "Graft Klinikasi",
                body: content || "Sizda yangi bildirishnoma bor",
            },
            webpush: {
                headers: {
                    "Urgency": "high",
                    "TTL": "86400"
                },
                fcm_options: {
                    link: customUrl
                }
            },
            data: {
                text: content || "Sizda yangi bildirishnoma bor",
                type: "NOTIFICATION_SYNC",
                patientId: pid,
                patientName: data.patientName || "",
                patientImage: data.patientImage || ""
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ FCM Push successfully delivered to ${userId}:`, response);

    } catch (error) {
        console.error(`❌ FCM Push Failed for ${userId}:`, error.message);

        // Auto-cleanup stale/invalid tokens so we don't keep trying
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('fcmTokens').doc(userId).delete();
            console.log(`🗑️ Removed invalid FCM token for user ${userId}`);
        }
    }
});

