// =============================================================
// TELEGRAM MAIL GATEWAY CORE ENGINE v13.0 - ANTI-CRASH SYSTEM
// =============================================================
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// SECURE CONFIGURATION & TOKEN INITIALIZATION
// -------------------------------------------------------------
const TOKEN = '8829940673:AAHqA6_LjlON9DXqMfUTkZ68__MC1O8ZR2I'; 
const OWNER_ID = '8430290683'; 
const TIKTOK_DEV_URL = 'https://www.tiktok.com/@emyjbl_'; 
const QRIS_URL = 'https://qu.ax/g1eRh'; 

const bot = new TelegramBot(TOKEN, { polling: true });
const dbPath = path.join(__dirname, 'database.json');

const customNameStorage = {};
const missionStorage = {};

// REGISTER BLUE MENU TELEGRAM COMMANDS
bot.setMyCommands([
  { command: 'start', description: 'Menampilkan menu utama bot' },
  { command: 'profile', description: 'Cek saldo poin, tier & status email' },
  { command: 'createmailr', description: 'Deploy email acak (Random)' },
  { command: 'createmailc', description: 'Deploy email kustom nama' },
  { command: 'checkinbox', description: 'Periksa kotak masuk / kode OTP' },
  { command: 'sendmail', description: 'Kirim email keluar (Developer Only)' },
  { command: 'topuppoint', description: 'Topup poin & upgrade tier premium' },
  { command: 'misitiktok', description: 'Ambil bonus poin gratis' },
  { command: 'claimdaily', description: 'Klaim bonus 10 poin harian' }
]).catch((err) => console.error("Gagal set perintah menu:", err.message));

// -------------------------------------------------------------
// DATABASE CORE ENGINE SYSTEM
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
  const today = new Date().toDateString();

  if (!db.users[chatId]) {
    db.users[chatId] = {
      name: firstName || 'User Node',
      points: 10,
      activeEmail: null,
      activeEmailToken: null,
      emailExpiry: null,
      tiktokClaimed: false,
      tier: 'B-Tier (Standard Free)', 
      tierExpiry: null,
      dailyUsageCustom: 0, 
      dailyUsageRandom: 0, 
      lastUsedDate: today
    };
    writeDB(db);
  }

  if (db.users[chatId].lastUsedDate !== today) {
    db.users[chatId].dailyUsageCustom = 0;
    db.users[chatId].dailyUsageRandom = 0;
    db.users[chatId].lastUsedDate = today;
    writeDB(db);
  }

  if (db.users[chatId].tierExpiry) {
    if (new Date() > new Date(db.users[chatId].tierExpiry)) {
      db.users[chatId].tier = 'B-Tier (Standard Free)';
      db.users[chatId].tierExpiry = null;
      writeDB(db);
      bot.sendMessage(chatId, `⚠️ *LISENSI SUBSCRIPTION EXPIRED*\n\nMasa langganan Premium Anda telah habis. Status Anda otomatis diturunkan kembali ke B-Tier (Free).`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
  }

  if (db.users[chatId].activeEmail && db.users[chatId].emailExpiry) {
    if (new Date() > new Date(db.users[chatId].emailExpiry)) {
      db.users[chatId].activeEmail = null;
      db.users[chatId].activeEmailToken = null;
      db.users[chatId].emailExpiry = null;
      writeDB(db);
      bot.sendMessage(chatId, `⏰ *EMAIL TEMPORARY EXPIRED*\n\nSesi email Anda telah melewati batas waktu masa aktif dan dihancurkan oleh sistem. Silakan deploy email baru!`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
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
// EVENT HANDLERS: INDEPENDENT CASE-INSENSITIVE REGEX ROUTERS
// -------------------------------------------------------------

bot.onText(/\/(start|menu)/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const welcomeText = `
⚙️ *PANDUAN UTAMA KENDALI BOT*
──────────────────────────────
🎲 /CreateMailR \`───\` Pasang Email Temp Acak
✍️ /CreateMailC \`───\` Pasang Email Temp Kustom
📥 /CheckInbox \`────\` Tarik Pesan Masuk / OTP
✉️ /SendMail \`──────\` Kirim Email Keluar Anonim

💳 *SISTEM AKUN & TOPUP POIN*
──────────────────────────────
👤 /Profile \`────────\` Cek Saldo, Tier & Limit
💵 /TopupPoint \`─────\` Isi Poin & Order Premium
🎁 /MisiTiktok \`─────\` Misi Follow Dev (*+10 Poin*)
📅 /ClaimDaily \`─────\` Klaim Jatah Poin Harian (*+10*)
──────────────────────────────
_Klik salah satu perintah berwarna biru di atas untuk mengoperasikan fitur bot secara instan._
`;
  bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText/\/profile/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);

  let customLimitText = '';
  let randomLimitText = 'Unlimited (Asal poin cukup)';

  if (isAdmin || user.tier.includes('S-Tier')) {
    customLimitText = 'Unlimited';
    randomLimitText = 'Unlimited';
  } else if (user.tier.includes('A-Tier')) {
    const totalUsed = (user.dailyUsageCustom || 0) + (user.dailyUsageRandom || 0);
    customLimitText = `${totalUsed} / 10 Pembuatan`;
    randomLimitText = `${totalUsed} / 10 Pembuatan`;
  } else {
    customLimitText = `${user.dailyUsageCustom || 0} / 1 Sesi Hari Ini`;
  }

  const expInfo = user.tierExpiry ? `\n🔹 *Expired Premium :* \`${new Date(user.tierExpiry).toLocaleDateString('id-ID')}\`` : '';
  let emailStatusText = 'Tidak ada sesi email yang aktif';
  
  if (user.activeEmail && user.emailExpiry) {
    const diffMs = new Date(user.emailExpiry) - new Date();
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      emailStatusText = `\`${user.activeEmail}\`\n🔹 *Sisa Sesi Aktif :* \`${diffHours} Jam ${diffMins} Menit lagi\``;
    }
  }

  const profileText = `
👤 *USER DATA METADATA PANEL*
──────────────────────────────
🔹 *Nama Pengguna :* ${user.name}
🔹 *ID Telegram   :* \`${chatId}\`
🔹 *Saldo Poin    :* *${isAdmin ? 'Unlimited (Owner)' : `${user.points} Points`}*
🔹 *Tier Lisensi  :* \`${isAdmin ? 'S-Tier (Developer)' : user.tier}\`${expInfo}

📊 *SISA LIMIT PEMBUATAN HARI INI*
──────────────────────────────
🔹 *Email Kustom  :* \`${customLimitText}\`
🔹 *Email Acak    :* \`${randomLimitText}\`

📥 *STATUS EMAIL TEMPORARY*
──────────────────────────────
🔹 *Email Aktif   :* ${emailStatusText}
──────────────────────────────
`;
  bot.sendMessage(chatId, profileText, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText/\/topuppoint/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const priceText = `
💳 *LIST TOPUP POIN & TIER PREMIUM*
──────────────────────────────
👑 *[ B-Tier ] - Standard Free (Default)*
 ├─ Harga : Rp0
 ├─ Masa Aktif Email : *3 Jam*
 └─ Limit Custom : *1x / Hari* (Acak Bebas)

👑 *[ A-Tier ] - Aero Custom Mail*
 ├─ Harga : *Rp11.000* (Aktif 14 Hari)
 ├─ Masa Aktif Email : *10 Jam*
 ├─ Total Limit Buat : *10x / Hari*
 └─ *DISKON POTONGAN POIN 50%*

👑 *[ S-Tier ] - Infinite Eclipse*
 ├─ Harga : *Rp15.000* (Aktif 30 Hari)
 ├─ Masa Aktif Email : *24 Jam Penuh*
 └─ *UNLIMITED & BYPASS 0 POIN (GRATIS SEPUASNYA)*
──────────────────────────────
📌 *PROSEDUR PEMBAYARAN:*
1. Scan kode QRIS resmi developer di atas.
2. Kirim bukti resi transfer sukses ke kontak Admin Owner: [Klik Hubungi Admin](tg://user?id=${OWNER_ID}) untuk aktivasi instan.
`;

  bot.sendPhoto(chatId, QRIS_URL, { caption: priceText, parse_mode: 'Markdown' }).catch(() => {
    bot.sendMessage(chatId, priceText + `\n\n⚠️ _(Gagal memuat gambar QRIS)_`, { parse_mode: 'Markdown' }).catch(()=>{});
  });
});

bot.onText/\/claimdaily/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  
  const db = readDB();
  db.users[chatId].points += 10;
  writeDB(db);
  
  bot.sendMessage(chatId, `🎁 *DAILY BONUS CLAIMED*\n\nSelamat! Rekening saldo Anda berhasil ditambahkan *+10 Poin* gratis harian.`).catch(()=>{});
});

bot.onText/\/misitiktok/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  
  if (user.tiktokClaimed) {
    return bot.sendMessage(chatId, `❌ *MISSION COMPLETED*\n\nAnda sudah menuntaskan jatah hadiah misi ini sebelumnya.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }

  const tiktokText = `
🎁 *MISI GRATIS BONUS POIN DEVS*
──────────────────────────────
Dapatkan bonus reward instan sebesar *+10 Poin* gratis langsung masuk dompet saldo Anda dengan langkah mudah:

1. Kunjungi tautan akun Dev: ${TIKTOK_DEV_URL}
2. Klik tombol *Follow / Ikuti* akun resmi kami.
3. Jika sudah selesai, kembali ke bot ini dan klik tombol konfirmasi di bawah ini:
──────────────────────────────
`;

  bot.sendMessage(chatId, tiktokText, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: '✅ Confirm To Developer', callback_data: 'tiktok_confirm' }]] }
  }).catch(()=>{});
});

bot.onText(/\/(createmailr|creater)/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);
  delete customNameStorage[chatId]; 

  let cost = user.tier.includes('A-Tier') ? 2 : (user.tier.includes('S-Tier') || isAdmin ? 0 : 5);

  bot.sendMessage(chatId, `🎲 *DEPLOY RANDOM EMAIL SYSTEM*\n──────────────────────────────\n• Jenis  : \`Random Auto Generated\`\n• Biaya  : \`${cost} Poin\`\n──────────────────────────────`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Random Email', callback_data: 'run_mail_random' }]] }
  }).catch(()=>{});
});

bot.onText(/\/(createmailc|createc)(?:\s+(.+))?/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);
  const requestedName = match[2] ? match[2].trim().toLowerCase().replace(/[^a-z0-9.]/g, '') : '';

  if (!requestedName) {
    return bot.sendMessage(chatId, `⚠️ *FORMAT EKSEKUSI SALAH*\n\nHarap masukkan nama kustom yang diinginkan di belakang perintah.\n\n*Contoh:* \`/CreateMailC emyber\``, { parse_mode: 'Markdown' }).catch(()=>{});
  }

  customNameStorage[chatId] = requestedName;
  let cost = user.tier.includes('A-Tier') ? 5 : (user.tier.includes('S-Tier') || isAdmin ? 0 : 10);

  bot.sendMessage(chatId, `✍️ *DEPLOY CUSTOM EMAIL SYSTEM*\n──────────────────────────────\n• Pilihan : \`${requestedName}\`\n• Biaya   : \`${cost} Poin\`\n──────────────────────────────`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Custom Email', callback_data: 'run_mail_custom' }]] }
  }).catch(()=>{});
});

bot.onText/\/checkinbox/i, async (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name); 

  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *SESSIONS NOT FOUND*\n\nSesi email Anda kosong atau sudah kedaluwarsa. Silakan deploy email baru.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }

  bot.sendChatAction(chatId, 'typing').catch(()=>{});

  try {
    const inboxResponse = await axios.get('https://api.mail.tm/messages', {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const messages = inboxResponse.data['hydra:member'];
    if (messages.length === 0) {
      return bot.sendMessage(chatId, `📭 *INBOX EMPTY*\n──────────────────────────────\nBelum ada email / kode OTP masuk di \`${user.activeEmail}\`.\n──────────────────────────────\n_Status: Listening / Standby..._`, { parse_mode: 'Markdown' }).catch(()=>{});
    }

    const newestMsgId = messages[0].id;
    const detailsResponse = await axios.get(`https://api.mail.tm/messages/${newestMsgId}`, {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const sender = detailsResponse.data.from.address;
    const senderName = detailsResponse.data.from.name || 'Anonymous Sender';
    const subject = detailsResponse.data.subject || 'No Subject';
    const bodyContent = detailsResponse.data.text || detailsResponse.data.intro || '(No Content)';

    bot.sendMessage(chatId, `📩 *NEW EMAIL INBOUND ARRIVED*\n──────────────────────────────\n• *Dari   :* ${senderName} <\`${sender}\`>\n• *Judul  :* *${subject}*\n\n*ISI PESAN / KODE OTP:*\n\`\`\`text\n${bodyContent.substring(0, 3000)}\n\`\`\`\n──────────────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});

  } catch (err) {
    bot.sendMessage(chatId, `❌ *GATEWAY SYNC ERROR*\n\nGagal terhubung sinkronisasi ke server cloud.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
});

bot.onText/\/sendmail/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const fakeMailText = `
🛠️ *DEVELOPER RESTRICTED FEATURE*
──────────────────────────────
Maaf, fitur pengiriman surat keluar (\`/SendMail\`) saat ini berada dalam status *Maintenance sandbox mode*.

Fitur ini dikunci dan dikhususkan hanya untuk pimpinan tim *System Developer & Maintenance Owner* guna mencegah pembongkaran kredensial serta *IP Blacklisting spam* server.
──────────────────────────────
`;
  bot.sendMessage(chatId, fakeMailText, { parse_mode: 'Markdown' }).catch(()=>{});
});

// COMMAND CONTROLLERS ADMIN OWNER (SETPOINT & SETTIER)
bot.onText(/\/setpoint\s+(\d+)\s+(\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== String(OWNER_ID)) return;

  const targetId = match[1].trim();
  const addedPoints = parseInt(match[2].trim());
  const db = readDB();

  if (!db.users[targetId]) return bot.sendMessage(chatId, `❌ User ID tidak ditemukan.`).catch(()=>{});

  db.users[targetId].points += addedPoints;
  writeDB(db);

  bot.sendMessage(chatId, `✅ *SUKSES INJEKSI POIN*\n\nUser ID: \`${targetId}\`\nJumlah Tambahan: \`+${addedPoints} Poin\``, { parse_mode: 'Markdown' }).catch(()=>{});
  bot.sendMessage(targetId, `🎉 *SALDO REFILL SUCCESS*\n\nAdmin telah menambahkan *+${addedPoints} Poin* ke dalam dompet Anda. Cek via /Profile!`, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/settier\s+(\d+)\s+([A-Z])\s+(\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== String(OWNER_ID)) return;

  const targetId = match[1].trim();
  const selectedTier = match[2].trim().toUpperCase();
  const daysActive = parseInt(match[3].trim());
  const db = readDB();

  if (!db.users[targetId]) return bot.sendMessage(chatId, `❌ User ID tidak ditemukan.`).catch(()=>{});

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysActive);

  db.users[targetId].tier = selectedTier === 'A' ? 'A-Tier (Aero Premium)' : 'S-Tier (Infinite Eclipse)';
  db.users[targetId].tierExpiry = expiryDate.toISOString();
  writeDB(db);

  bot.sendMessage(chatId, `✅ *UPGRADE PREMIUM SUKSES*`, { parse_mode: 'Markdown' }).catch(()=>{});
  bot.sendMessage(targetId, `🎉 *UPGRADE TIER PREMIUM SUKSES*\n\nAkun Anda telah ditingkatkan menjadi *${db.users[targetId].tier}* selama *${daysActive} hari* oleh Admin!`, { parse_mode: 'Markdown' }).catch(()=>{});
});

// -------------------------------------------------------------
// INTERACTIVE DISPATCHER (CALLBACK INTERFACE HANDLING)
// -------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = String(query.message.chat.id).trim();
  const data = query.data;
  bot.answerCallbackQuery(query.id).catch(() => {});

  const db = readDB();
  const isAdmin = chatId === String(OWNER_ID);
  const user = db.users[chatId] || verifyUser(chatId, query.from.first_name);

  if (data === 'run_mail_random' || data === 'run_mail_custom') {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

    let cost = data === 'run_mail_custom' ? 10 : 5;
    if (user.tier.includes('A-Tier')) cost = data === 'run_mail_custom' ? 5 : 2;
    if (user.tier.includes('S-Tier') || isAdmin) cost = 0;

    if (!isAdmin && !user.tier.includes('S-Tier')) {
      if (user.tier.includes('B-Tier') && data === 'run_mail_custom' && user.dailyUsageCustom >= 1) {
        return bot.sendMessage(chatId, `❌ *LIMIT ACCESS DENIED*\n\nAkun B-Tier (Free) dibatasi maksimal Pembuatan Email Custom **1x per hari**.`, { parse_mode: 'Markdown' }).catch(()=>{});
      }
      if (user.tier.includes('A-Tier') && ((user.dailyUsageCustom || 0) + (user.dailyUsageRandom || 0)) >= 10) {
        return bot.sendMessage(chatId, `❌ *LIMIT ACCESS DENIED*\n\nAkun A-Tier Anda sudah mencapai batas harian maksimal global yaitu **10x pembuatan**.`, { parse_mode: 'Markdown' }).catch(()=>{});
      }
      if (user.points < cost) {
        return bot.sendMessage(chatId, `❌ *SALDO POIN TIDAK CUKUP*\n\nSisa saldo Anda: ${user.points} Poin.`, { parse_mode: 'Markdown' }).catch(()=>{});
      }
    }

    try {
      const liveMsg = await bot.sendMessage(chatId, `\`[SYSTEM PROLOG]\` Connecting to Mail.tm cloud gateway...`, { parse_mode: 'Markdown' });

      const domainsResponse = await axios.get('https://api.mail.tm/domains');
      const availableDomain = domainsResponse.data['hydra:member'][0].domain;

      const finalUsername = (data === 'run_mail_custom' && customNameStorage[chatId]) ? customNameStorage[chatId] : makeRandomString(9);
      const randomPass = makeRandomString(12);
      const generatedEmail = `${finalUsername}@${availableDomain}`;
      delete customNameStorage[chatId];

      await axios.post('https://api.mail.tm/accounts', { address: generatedEmail, password: randomPass });
      const tokenResponse = await axios.post('https://api.mail.tm/token', { address: generatedEmail, password: randomPass });
      const tokenJwt = tokenResponse.data.token;

      let activeHours = user.tier.includes('B-Tier') ? 3 : (user.tier.includes('S-Tier') || isAdmin ? 24 : 10);
      const expiryTimestamp = new Date(Date.now() + activeHours * 60 * 60 * 1000);

      db.users[chatId].points -= cost;
      db.users[chatId].activeEmail = generatedEmail;
      db.users[chatId].activeEmailToken = tokenJwt;
      db.users[chatId].emailExpiry = expiryTimestamp.toISOString();
      
      if (data === 'run_mail_custom') {
        db.users[chatId].dailyUsageCustom = (db.users[chatId].dailyUsageCustom || 0) + 1;
      } else {
        db.users[chatId].dailyUsageRandom = (db.users[chatId].dailyUsageRandom || 0) + 1;
      }
      writeDB(db);

      const successTemplate = `
✅ *TEMP MAIL DEPLOYED SUCCESS*
──────────────────────────────
• *Email Temp :* \`${generatedEmail}\`
• *Durasi Aktif :* \`${activeHours} Jam Penuh\`
• *Masa Berlaku :* \`${expiryTimestamp.toLocaleTimeString('id-ID')} WIB\`
──────────────────────────────
_Email ini akan otomatis hancur secara permanen dari server setelah batas waktu berlalu. Jalankan /CheckInbox untuk melihat pesan masuk._
`;
      await bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, successTemplate, { parse_mode: 'Markdown' }).catch(()=>{});
      });

    } catch (err) {
      bot.sendMessage(chatId, `❌ Gagal memproses pendaftaran ke cloud server. Silakan coba lagi.`).catch(()=>{});
      delete customNameStorage[chatId];
    }
  }

  if (data === 'tiktok_confirm') {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    missionStorage[chatId] = 'awaiting_tiktok_username';
    bot.sendMessage(chatId, `✍️ *VERIFIKASI MANUAL*\n\nSilakan ketik dan kirimkan **Username TikTok** Anda yang digunakan untuk mem-follow (Contoh: \`@emyber\`):`).catch(()=>{});
  }

  if (data.startsWith('approve_tk_')) {
    const targetUserId = data.replace('approve_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    if (db.users[targetUserId] && !db.users[targetUserId].tiktokClaimed) {
      db.users[targetUserId].points += 10;
      db.users[targetUserId].tiktokClaimed = true;
      writeDB(db);
      bot.sendMessage(chatId, `✅ Berhasil menyetujui klaim misi TikTok untuk User ID: \`${targetUserId}\`.`).catch(()=>{});
      bot.sendMessage(targetUserId, `🎉 *MISI DISUBMIT & DISETUJUI*\n\nKlaim misi TikTok Anda disetujui oleh Owner! Saldo Anda bertambah *+10 Poin* gratis.`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
  }

  if (data.startsWith('reject_tk_')) {
    const targetUserId = data.replace('reject_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Klaim misi untuk User ID: \`${targetUserId}\` telah ditolak.`).catch(()=>{});
    bot.sendMessage(targetUserId, `❌ *MISI FOLLOW DITOLAK*\n\nMaaf, pengajuan klaim poin Anda ditolak oleh Developer.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
});

// -------------------------------------------------------------
// AUXILIARY LISTENERS: TEXT INPUT HANDLING WITH SAFE PARSING
// -------------------------------------------------------------
bot.on('message', (msg) => {
  const chatId = String(msg.chat.id).trim();
  
  if (!msg.text || msg.text.startsWith('/')) return;
  
  if (missionStorage[chatId] === 'awaiting_tiktok_username') {
    const tkUser = msg.text.trim();
    delete missionStorage[chatId];
    
    verifyUser(chatId, msg.from.first_name);
    
    // Kirim konfirmasi ke user tanpa parse_mode Markdown agar karakter khusus tidak memicu crash
    bot.sendMessage(chatId, `🕒 VERIFIKASI TIKTOK SENT\n\nBukti akun "${tkUser}" sudah dikirimkan. Harap tunggu proses verifikasi manual oleh Owner.`).catch(()=>{});
    
    // Kirim notifikasi konfirmasi ke Telegram Owner
    bot.sendMessage(OWNER_ID, `📢 KLAIM MISI TIKTOK REQUEST\n\n• User ID : ${chatId}\n• Nama Akun : ${msg.from.first_name || 'User'}\n• Bukti TikTok : ${tkUser}`, {
      reply_markup: { 
        inline_keyboard: [
          [
            { text: '✅ Setujui (+10 Poin)', callback_data: `approve_tk_${chatId}` }, 
            { text: '❌ Tolak', callback_data: `reject_tk_${chatId}` }
          ]
        ] 
      }
    }).catch((err) => {
      console.error("Gagal mengirimkan data approval ke Owner:", err.message);
    });
  }
});

// GLOBAL UNCAUGHT EXCEPTION CATCHER (MENCEGAH BOT COLLAPSE)
process.on('uncaughtException', (err) => {
  console.error('Sistem mendeteksi error tidak tertangkap:', err.message);
});

console.log(`=================================================\n       CORE SYSTEM v13.0 RUNNING WITH ANTI-CRASH\n=================================================`);
