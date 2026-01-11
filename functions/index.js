
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { Telegraf, Markup } = require("telegraf");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
const BOT_TOKEN = '8234286653:AAGAD8fDKz9AqirDAqOIaddZuPCq4keln-w';

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);

// --- LOCALIZATION ---
const TEXTS = {
    uz: {
        welcome: "👋 Assalomu alaykum! Iltimos, muloqot tilini tanlang:",
        ask_contact: "📲 Iltimos, telefon raqamingizni yuborish uchun pastdagi tugmani bosing:",
        share_contact_btn: "📱 Telefon raqamini yuborish",
        searching: "🔍 Tekshirilmoqda...",
        not_found: "❌ Kechirasiz, ushbu raqam bazada topilmadi. Iltimos, to'g'ri raqamdan foydalanayotganingizga ishonch hosil qiling yoki administratorga murojaat qiling.",
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
        not_found: "❌ К сожалению, этот номер не найден в базе. Пожалуйста, убедитесь, что вы используете правильный номер, или обратитесь к администратору.",
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
        not_found: "❌ Sorry, this number was not found in our database. Please select the correct number or contact admin.",
        success: (name) => `✅ Welcome, **Dear ${name}**! You have successfully connected.`,
        reminder_title: "Reminder! 🎗",
        injection_msg: (name, date, time) => `Hello **Dear ${name}**! Just a reminder about your scheduled injection.\n\n🗓 Date: **${date}**\n⏰ Time: **${time}**\n\nPlease come on time. Take care! 😊`,
        check_btn: "📅 Check Schedule",
        next_injection_found: (name, date, time) => `👤 **Dear ${name}**\n\nYour next scheduled injection:\n🗓 Date: **${date}**\n⏰ Time: **${time}**`,
        no_injection_found: (name) => `👤 **Dear ${name}**\n\nYou have no upcoming injections scheduled. 😊`
    }
};

// In Cloud Functions, memory is ephemeral, but okay for session flow in short term.
const userSessions = {};

// --- BOT LOGIC ---

bot.start((ctx) => {
    ctx.reply(TEXTS.uz.welcome, Markup.inlineKeyboard([
        [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz')],
        [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
        [Markup.button.callback('🇬🇧 English', 'lang_en')]
    ]));
});

// Language Selection Handlers
['uz', 'ru', 'en'].forEach(lang => {
    bot.action(`lang_${lang}`, async (ctx) => {
        const userId = ctx.from.id;
        userSessions[userId] = { lang }; // Store language preference

        await ctx.answerCbQuery();
        // Use object syntax for contact button
        await ctx.reply(TEXTS[lang].ask_contact, Markup.keyboard([
            [{ text: TEXTS[lang].share_contact_btn, request_contact: true }]
        ]).resize().oneTime());
    });
});

// Contact Handler
bot.on('contact', async (ctx) => {
    const userId = ctx.from.id;
    const contact = ctx.message.contact;
    const lang = userSessions[userId]?.lang || 'en'; // Default to EN if lost

    if (contact.user_id !== userId) {
        return ctx.reply("❌ Please send your own contact.");
    }

    await ctx.reply(TEXTS[lang].searching, Markup.removeKeyboard());

    try {
        let rawPhone = contact.phone_number;
        if (!rawPhone.startsWith('+')) rawPhone = '+' + rawPhone;
        const cleanPhone = rawPhone.replace(/\s/g, ''); // Ensure no spaces
        const variants = [cleanPhone];

        // If Uzbek number (+998), try to generate the specific web-app format: "+998 93 748 91 41"
        if (cleanPhone.startsWith('+998') && cleanPhone.length === 13) {
            // +998 AA BBB CC DD
            const country = cleanPhone.substring(0, 4); // +998
            const code = cleanPhone.substring(4, 6);    // 93
            const part1 = cleanPhone.substring(6, 9);   // 748
            const part2 = cleanPhone.substring(9, 11);  // 91
            const part3 = cleanPhone.substring(11, 13); // 41

            const formatted = `${country} ${code} ${part1} ${part2} ${part3}`;
            variants.push(formatted);
        }

        console.log(`Searching for patient with variants:`, variants);

        const patientsRef = db.collection('patients');
        // Use 'in' query to match any valid format
        const snapshot = await patientsRef.where("phone", "in", variants).get();

        if (snapshot.empty) {
            console.log("Patient not found.");
            console.log(`Failed variants: ${variants.join(', ')}`);
            return ctx.reply(TEXTS[lang].not_found);
        }

        const patientDoc = snapshot.docs[0];
        const patientData = patientDoc.data();
        const patientId = patientDoc.id;

        await patientsRef.doc(patientId).update({
            telegramChatId: userId.toString(),
            botLanguage: lang
        });

        const patientName = patientData.fullName || patientData.name || patientData.full_name || "Patient";
        console.log(`Patient verified: ${patientName} (${patientId})`);

        // Success Message + Persistent Keyboard with Check Button
        await ctx.reply(TEXTS[lang].success(patientName), { parse_mode: 'Markdown' });
        await ctx.reply("👇", Markup.keyboard([
            [TEXTS[lang].check_btn]
        ]).resize());

    } catch (error) {
        console.error("Error during verification:", error);
        ctx.reply("⚠️ System error. Please try again later.");
    }
});

// Helper for Check Schedule
async function checkSchedule(ctx) {
    const userId = ctx.from.id;
    try {
        const patientsRef = db.collection('patients');
        const snapshot = await patientsRef.where("telegramChatId", "==", userId.toString()).get();
        if (snapshot.empty) return ctx.reply("❌ Profilingiz topilmadi / Profile not found.");

        const patient = snapshot.docs[0].data();
        const lang = patient.botLanguage || 'uz';
        const name = patient.fullName || patient.name || patient.full_name || "Patient";

        if (patient.injections && Array.isArray(patient.injections)) {
            const now = new Date();
            const nowStr = now.toISOString().split('T')[0];

            // Filter for future scheduled injections
            const upcoming = patient.injections
                .filter(inj => inj.status === 'Scheduled' && inj.date >= nowStr) // Only future or today
                .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

            if (upcoming.length > 0) {
                const nextInj = upcoming[0];
                let time = "09:00";
                if (nextInj.date.includes('T')) time = nextInj.date.split('T')[1].substring(0, 5);

                // Format Date
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
        console.error("Check Schedule Error:", error);
        ctx.reply("⚠️ Error checking schedule.");
    }
}

// Handlers for Check Schedule Button (All languages)
bot.hears([TEXTS.uz.check_btn, TEXTS.ru.check_btn, TEXTS.en.check_btn], (ctx) => checkSchedule(ctx));

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

                    const p = bot.telegram.sendMessage(chatId,
                        `${TEXTS[lang].reminder_title}\n\n${TEXTS[lang].injection_msg(name, tomorrowStr, time)}`
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
// 3. Notification Sender (Real-time Firestore Trigger)
// Listens for new documents in 'outbound_messages' and sends them via Telegram.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.notificationSender = onDocumentCreated("outbound_messages/{msgId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const data = snapshot.data();
    const docId = event.params.msgId;

    // Only process PENDING messages
    if (data.status !== 'PENDING') return;

    const { telegramChatId, text, patientName } = data;

    if (!telegramChatId || !text) {
        console.error("Missing telegramChatId or text");
        return;
    }

    console.log(`📨 Processing outbound message for ${patientName} (${telegramChatId})`);

    try {
        await bot.telegram.sendMessage(telegramChatId, text, { parse_mode: 'Markdown' });

        // Mark as SENT
        await snapshot.ref.update({
            status: 'SENT',
            sentAt: new Date().toISOString()
        });
        console.log(`✅ Message sent to ${patientName}`);
    } catch (error) {
        console.error(`❌ Failed to send message to ${patientName}:`, error.message);
        // Mark as FAILED
        await snapshot.ref.update({
            status: 'FAILED',
            error: error.message
        });
    }
});
