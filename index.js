// =============================================================
// TELEGRAM CORE MAIL GATEWAY ENGINE v5.0 (ADVANCED ROUTING)
// =============================================================
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// SECURE CONFIGURATION & TOKEN INITIALIZATION
// -------------------------------------------------------------
const TOKEN = '8829940673:AAHqA6_LjlON9DXqMfUTkZ68__MC1O8ZR2I'; // 👈 Taruh Token Bot Telegram Kamu Disini
const OWNER_ID = '8430290683'; // 👈 Taruh ID Telegram Kamu Disini (Harus angka asli, tanpa kutip juga boleh)
const TIKTOK_DEV_URL = 'https://www.tiktok.com/@emyjbl_'; // 👈 Ganti dengan link TikTok kamu

const bot = new TelegramBot(TOKEN, { polling: true });
const dbPath = path.join(__dirname, 'database.json');

// Memory storage sementara untuk session user
const customNameStorage = {};
const missionStorage = {};

// -------------------------------------------------------------
// DATABASE ENGINE SYSTEM (READ / WRITE)
// -------------------------------------------------------------
function readDB() {
  if (!fs.existsSync(dbPath)) {
    const initData = { users: {} };
    fs.writeFileSync(dbPath, JSON.stringify(initData, null, 2));
    return initData;
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function verifyUser(chatId, firstName) {
  const db = readDB();
  if (!db.users[chatId]) {
    db.users[chatId] = {
      name: firstName || 'User Node',
      points: 10,
      activeEmail: null,
      activeEmailToken: null,
      tiktokClaimed: false
    };
    writeDB(db);
  }
  return db.users[chatId];
}

function makeRandomString(length) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// -------------------------------------------------------------
// COMMAND 1: START / PROFILE INTERFACE
// -------------------------------------------------------------
bot.onText(/\/start/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);

  const currentPoints = isAdmin ? 'Unlimited (Admin Mode)' : `${user.points} Points`;
  const emailSession = user.activeEmail ? `\`${user.activeEmail}\`` : 'Tidak ada sesi aktif';

  const welcomeText = `
👋 *Halo, ${user.name}!* Selamat datang di Portal Mail Gateway.

*INFORMASI AKUN ANDA:*
• License: *${isAdmin ? 'Infinite / Owner' : 'Standard Tier'}*
• Current Balance: *${currentPoints}*
• Active Mail: ${emailSession}

*MENU UTAMA PERINTAH BOT:*
🎲 \`/CreateMailR\` - Buat Email Acak (5 Poin)
✍️ \`/CreateMailC [nama]\` - Buat Email Kustom (10 Poin)
📥 \`/CheckInbox\` - Cek pesan masuk / kode OTP
✉️ \`/SendMail\` - Kirim email keluar anonim
🎁 \`/MisiTiktok\` - Follow TikTok Dev dapat *+10 Poin* gratis!
💳 \`/ClaimDaily\` - Ambil bonus 10 poin harian
`;

  bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
});

// -------------------------------------------------------------
// COMMAND 2: CLAIM DAILY BONUS
// -------------------------------------------------------------
bot.onText(/\/ClaimDaily/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const db = readDB();
  db.users[chatId].points += 10;
  writeDB(db);

  bot.sendMessage(chatId, `🎁 *DAILY BONUS CLAIMED*\n\nSelamat! Anda mendapatkan *+10 Points* gratis.`);
});

// -------------------------------------------------------------
// COMMAND 3: CREATE RANDOM MAIL (/CreateMailR) -> COST: 5 POIN
// -------------------------------------------------------------
bot.onText(/\/CreateMailR/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  
  delete customNameStorage[chatId]; // Pastikan tidak memakai nama kustom

  const menuText = `
🎲 *DEPLOY RANDOM EMAIL NODE*
───────────────────────
Klik tombol di bawah untuk alokasi email sistem acak:

• *Request Type:* \`Random Generation\`
• *Cost:* \`5 Points Allocation\`
───────────────────────
`;
  bot.sendMessage(chatId, menuText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Random Email', callback_data: 'run_mail_random' }]] }
  });
});

// -------------------------------------------------------------
// COMMAND 4: CREATE CUSTOM MAIL (/CreateMailC [nama]) -> COST: 10 POIN
// -------------------------------------------------------------
bot.onText(/\/CreateMailC(?:\s+(.+))?/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const requestedName = match[1] ? match[1].trim().toLowerCase().replace(/[^a-z0-9.]/g, '') : '';

  if (!requestedName) {
    return bot.sendMessage(chatId, `⚠️ *INPUT NAMA DIBUTUHKAN*\n\nGunakan format:\n\`/CreateMailC namapilihanmu\`\n\n_Contoh: /CreateMailC emyftg_`, { parse_mode: 'Markdown' });
  }

  customNameStorage[chatId] = requestedName;

  const menuText = `
✍️ *DEPLOY CUSTOM EMAIL NODE*
───────────────────────
Klik tombol di bawah untuk memproses nama kustom pilihanmu:

• *Requested Name:* \`${requestedName}\`
• *Request Type:* \`Custom Configuration\`
• *Cost:* \`10 Points Allocation\`
───────────────────────
`;
  bot.sendMessage(chatId, menuText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Custom Email', callback_data: 'run_mail_custom' }]] }
  });
});

// -------------------------------------------------------------
// COMMAND 5: MISI FOLLOW TIKTOK FOR POINTS
// -------------------------------------------------------------
bot.onText(/\/MisiTiktok/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);

  if (user.tiktokClaimed) {
    return bot.sendMessage(chatId, `❌ *MISSION COMPLETED*\n\nAnda sudah mengambil bonus misi ini sebelumnya. Tiap pengguna hanya bisa mengklaim sekali!`, { parse_mode: 'Markdown' });
  }

  const missionText = `
🎁 *MISI FOLLOW TIKTOK DEVELOPER*
───────────────────────
Dapatkan bonus *+10 Poin* gratis langsung ke dompet akun Anda dengan mengikuti langkah mudah ini:

1. Klik link tautan TikTok Developer di bawah ini.
2. Tekan tombol *Follow / Ikuti*.
3. Setelah selesai, kembali ke bot ini lalu tekan tombol *Confirm To Developer*.

🔗 *LINK TIKTOK:* [KLIK DI SINI UNTUK FOLLOW](${TIKTOK_DEV_URL})
───────────────────────
`;
  bot.sendMessage(chatId, missionText, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: '✅ Confirm To Developer', callback_data: 'tiktok_confirm' }]]
    }
  });
});

// -------------------------------------------------------------
// CAPTURING TEXT INPUT (UNTUK BUKTI USERNAME TIKTOK & LAINNYA)
// -------------------------------------------------------------
bot.on('message', (msg) => {
  const chatId = String(msg.chat.id).trim();
  if (!msg.text || msg.text.startsWith('/')) return;

  // Jika user sedang dalam tahap mengirim bukti username TikTok
  if (missionStorage[chatId] === 'awaiting_tiktok_username') {
    const tiktokUsername = msg.text.trim();
    delete missionStorage[chatId];

    bot.sendMessage(chatId, `🕒 *BUKTI DITERIMA*\n\nPermintaan verifikasi akun TikTok \`${tiktokUsername}\` telah diteruskan ke Developer. Mohon tunggu proses approval manual!`, { parse_mode: 'Markdown' });

    // Kirim notifikasi pengajuan ke OWNER / ADMIN
    bot.sendMessage(OWNER_ID, `
📢 *PENGAJUAN KLAIM MISI TIKTOK*
───────────────────────
• *User ChatID:* \`${chatId}\`
• *Nama Akun:* ${msg.from.first_name}
• *Username TikTok Bukti:* \`${tiktokUsername}\`
───────────────────────
Silakan cek akun TikTok Anda dan pilih tindakan di bawah ini:
`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Setujui (+10 Poin)', callback_data: `approve_tk_${chatId}` },
            { text: '❌ Tolak Misi', callback_data: `reject_tk_${chatId}` }
          ]
        ]
      }
    });
  }
});

// -------------------------------------------------------------
// INTERACTIVE ENGINE: CALLBACK QUERY HANDLING
// -------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = String(query.message.chat.id).trim();
  const data = query.data;

  bot.answerCallbackQuery(query.id).catch(() => {});

  const db = readDB();
  const isAdmin = chatId === String(OWNER_ID);

  // --- LOGIKA ENGINE GENERATOR MAIL.TM ---
  if (data === 'run_mail_random' || data === 'run_mail_custom') {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    
    const user = db.users[chatId] || { points: 0 };
    const cost = data === 'run_mail_custom' ? 10 : 5;

    if (!isAdmin) {
      if (user.points < cost) {
        return bot.sendMessage(chatId, `❌ *SALDO KURANG*\n\nSaldo Anda sisa (${user.points} Poin). Anda membutuhkan ${cost} poin untuk deploy server ini. Silakan /ClaimDaily atau /MisiTiktok`, { parse_mode: 'Markdown' });
      }
      db.users[chatId].points -= cost;
    }

    try {
      const liveMsg = await bot.sendMessage(chatId, `\`[SYSTEM PROLOG]\` Fetching active domain options...`, { parse_mode: 'Markdown' });
      const delay = (ms) => new Promise(res => setTimeout(res, ms));

      const domainsResponse = await axios.get('https://api.mail.tm/domains');
      const availableDomain = domainsResponse.data['hydra:member'][0].domain;

      await delay(200);
      await bot.editMessageText(`\`[COMPILING]\` Registering resource sandbox...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

      const finalUsername = (data === 'run_mail_custom' && customNameStorage[chatId]) ? customNameStorage[chatId] : makeRandomString(9);
      const randomPass = makeRandomString(12);
      const generatedEmail = `${finalUsername}@${availableDomain}`;

      delete customNameStorage[chatId];

      await axios.post('https://api.mail.tm/accounts', { address: generatedEmail, password: randomPass });
      await delay(200);
      await bot.editMessageText(`\`[ENCRYPTION]\` Acquiring authorization tokens...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

      const tokenResponse = await axios.post('https://api.mail.tm/token', { address: generatedEmail, password: randomPass });
      const tokenJwt = tokenResponse.data.token;

      db.users[chatId].activeEmail = generatedEmail;
      db.users[chatId].activeEmailToken = tokenJwt;
      writeDB(db);

      const latestPoints = isAdmin ? 'Unlimited (Admin Mode)' : `${db.users[chatId].points} Points`;

      const successTemplate = `
✅ *TEMP MAIL SERVER DEPLOYED SUCCESS*
───────────────────────
• *Temporary Email:* \`${generatedEmail}\`

*NODE METADATA LOG*
• Mail Core: \`MAIL.TM POWERED NODE\`
• Session Fee: ${isAdmin ? '0 Points (Bypass)' : `${cost} Points Deducted`}
• Current Balance: *${latestPoints}*
• Inbox Status: \`Listening / Waiting for OTP\`

_Gunakan email untuk mendaftar, lalu ketik perintah /CheckInbox untuk menarik pesan masuk!_
───────────────────────
`;
      await bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, successTemplate, { parse_mode: 'Markdown' });
      });

    } catch (err) {
      console.error('Error Mail API:', err.message);
      if (err.response && err.response.status === 422) {
        bot.sendMessage(chatId, `❌ *REGISTRATION FAILED*\n\nNama kustom tersebut sudah diklaim orang lain di server global. Silakan cari nama kustom yang lain!`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ Gagal mengambil node email dari server Mail.tm. Silakan coba lagi.`, { parse_mode: 'Markdown' });
      }
      delete customNameStorage[chatId];
    }
  }

  // --- LOGIKA MISI TIKTOK ---
  if (data === 'tiktok_confirm') {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    missionStorage[chatId] = 'awaiting_tiktok_username';
    bot.sendMessage(chatId, `✍️ *VERIFIKASI IDENTITAS*\n\nSilakan ketik dan kirimkan **Username TikTok** Anda (contoh: \`@emy_ganteng\`) sebagai bukti konfirmasi follow:`);
  }

  // --- LOGIKA APPROVAL SISI ADMIN/OWNER ---
  if (data.startsWith('approve_tk_')) {
    const targetUserId = data.replace('approve_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

    if (db.users[targetUserId] && !db.users[targetUserId].tiktokClaimed) {
      db.users[targetUserId].points += 10;
      db.users[targetUserId].tiktokClaimed = true;
      writeDB(db);

      bot.sendMessage(chatId, `✅ Berhasil menyetujui klaim misi untuk User ID: \`${targetUserId}\`. Poin +10 dikirim!`, { parse_mode: 'Markdown' });
      bot.sendMessage(targetUserId, `🎉 *MISI TIKTOK DISETUJUI*\n\nDeveloper telah mengonfirmasi follow Anda! Selamat, akun Anda mendapatkan bonus ganjaran **+10 Points** gratis.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `⚠️ User sudah dikonfirmasi atau data tidak valid.`);
    }
  }

  if (data.startsWith('reject_tk_')) {
    const targetUserId = data.replace('reject_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

    bot.sendMessage(chatId, `❌ Berhasil menolak klaim misi untuk User ID: \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
    bot.sendMessage(targetUserId, `❌ *MISI TIKTOK DITOLAK*\n\nMaaf, klaim misi Anda ditolak oleh Developer. Pastikan Anda sudah mem-follow akun TikTok asli milik Developer sebelum menekan tombol konfirmasi.`, { parse_mode: 'Markdown' });
  }
});

// -------------------------------------------------------------
// COMMAND 6: CHECK INBOX SYSTEM
// -------------------------------------------------------------
bot.onText(/\/CheckInbox/i, async (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);

  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *SESSIONS EMPTY*\n\nSilakan buat email aktif terlebih dahulu lewat perintah /CreateMailR atau /CreateMailC`, { parse_mode: 'Markdown' });
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const inboxResponse = await axios.get('https://api.mail.tm/messages', {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const messages = inboxResponse.data['hydra:member'];

    if (messages.length === 0) {
      return bot.sendMessage(chatId, `📭 *INBOX EMPTY*\n\nBelum ada email masuk di \`${user.activeEmail}\`.`, { parse_mode: 'Markdown' });
    }

    const newestMsgId = messages[0].id;
    const detailsResponse = await axios.get(`https://api.mail.tm/messages/${newestMsgId}`, {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const sender = detailsResponse.data.from.address;
    const senderName = detailsResponse.data.from.name || 'Anonymous Sender';
    const subject = detailsResponse.data.subject || 'No Subject';
    const bodyContent = detailsResponse.data.text || detailsResponse.data.intro || '(Pesan Kosong)';

    const mailTemplate = `
📩 *NEW EMAIL ARRIVED SUCCESS*
───────────────────────
• *Active Mail:* \`${user.activeEmail}\`
• *From Sender:* ${senderName} <\`${sender}\`>
• *Subject:* *${subject}*

*MESSAGE BODY / OTP CODE:*
\`\`\`text
${bodyContent.substring(0, 3500)}
\`\`\`
───────────────────────
`;
    bot.sendMessage(chatId, mailTemplate, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Error CheckInbox:', err.message);
    bot.sendMessage(chatId, `❌ *GATEWAY SYNC ERROR*\n\nGagal membaca data dari server.`, { parse_mode: 'Markdown' });
  }
});

// -------------------------------------------------------------
// COMMAND 7: SEND OUTBOUND MAIL
// -------------------------------------------------------------
bot.onText(/\/SendMail\s+(.+)/i, async (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);

  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *ACCESS DENIED*\n\nHarus memiliki sesi email aktif sebagai otorisasi jalur kirim keluar.`, { parse_mode: 'Markdown' });
  }

  const args = match[1].split('|');
  if (args.length < 3) {
    return bot.sendMessage(chatId, `⚠️ *FORMAT SALAH*\n\nGunakan format:\n\`/SendMail email_tujuan@gmail.com | Judul Email | Isi pesan\``, { parse_mode: 'Markdown' });
  }

  const toEmail = args[0].trim();
  const subjectEmail = args[1].trim();
  const bodyEmail = args[2].trim();

  bot.sendChatAction(chatId, 'typing');

  try {
    await axios.post('https://api.mail.tm/messages', {
      to: [toEmail],
      subject: subjectEmail,
      text: bodyEmail
    }, {
      headers: { 
        'Authorization': `Bearer ${user.activeEmailToken}`,
        'Content-Type': 'application/json'
      }
    });

    bot.sendMessage(chatId, `✅ *EMAIL DISPATCHED SUCCESS*\n\nTerkirim anonim dari \`${user.activeEmail}\` ke \`${toEmail}\`.`, { parse_mode: 'Markdown' });

  } catch (err) {
    bot.sendMessage(chatId, `❌ *RELAY REJECTED*\n\nGagal mengirim email keluar. Domain gratis dibatasi server.`, { parse_mode: 'Markdown' });
  }
});

console.log(`
=================================================
       CORE SYSTEM v5.0 RUNNING CLEAR           
  RANDOM(5P) / CUSTOM(10P) & MISI TIKTOK ONLINE
=================================================
`);
