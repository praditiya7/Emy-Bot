// =============================================================
// TELEGRAM CORE MAIL GATEWAY ENGINE v8.0 (ADVANCED LOGIC SYSTEM)
// =============================================================
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// SECURE CONFIGURATION & TOKEN INITIALIZATION
// -------------------------------------------------------------
const TOKEN = '8829940673:AAHqA6_LjlON9DXqMfUTkZ68__MC1O8ZR2I'; // 👈 Taruh Token Bot Telegram Kamu
const OWNER_ID = '8430290683'; // 👈 Taruh ID Telegram Kamu (Admin Bypass)
const TIKTOK_DEV_URL = 'https://www.tiktok.com/@username_kamu'; // 👈 Ganti link TikTok kamu
const QRIS_URL = 'https://qu.ax/g1eRh'; // 👈 [BARIS 13] Taruh URL Direct gambar QRIS kamu di sini

const bot = new TelegramBot(TOKEN, { polling: true });
const dbPath = path.join(__dirname, 'database.json');

const customNameStorage = {};
const missionStorage = {};

// -------------------------------------------------------------
// DATABASE ENGINE SYSTEM (WITH DYNAMIC EXPIRY & LIMITS)
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
      dailyUsageCustom: 0, // Hitung khusus limit email custom harian
      dailyUsageRandom: 0, // Hitung email random harian
      lastUsedDate: today
    };
    writeDB(db);
  }

  // Auto-reset kuota harian jika ganti hari
  if (db.users[chatId].lastUsedDate !== today) {
    db.users[chatId].dailyUsageCustom = 0;
    db.users[chatId].dailyUsageRandom = 0;
    db.users[chatId].lastUsedDate = today;
    writeDB(db);
  }

  // Cek apakah masa berlaku Tier Premium A atau S sudah habis
  if (db.users[chatId].tierExpiry) {
    if (new Date() > new Date(db.users[chatId].tierExpiry)) {
      db.users[chatId].tier = 'B-Tier (Standard Free)';
      db.users[chatId].tierExpiry = null;
      writeDB(db);
      bot.sendMessage(chatId, `⚠️ *LISENSI EXPIRED*\n\nMasa langganan Premium Anda telah habis. Status Anda diturunkan kembali ke B-Tier (Free).`, { parse_mode: 'Markdown' });
    }
  }

  // Auto Checker: Deteksi apakah email temporary yang aktif sudah hangus/expired
  if (db.users[chatId].activeEmail && db.users[chatId].emailExpiry) {
    if (new Date() > new Date(db.users[chatId].emailExpiry)) {
      db.users[chatId].activeEmail = null;
      db.users[chatId].activeEmailToken = null;
      db.users[chatId].emailExpiry = null;
      writeDB(db);
      bot.sendMessage(chatId, `⏰ *EMAIL TEMPORARY EXPIRED*\n\nSesi email sementara Anda telah melewati batas waktu aktif dan telah dihancurkan otomatis oleh sistem. Silakan deploy email baru!`, { parse_mode: 'Markdown' });
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
// COMMAND 1: START
// -------------------------------------------------------------
bot.onText(/\/start/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const welcomeText = `
👋 Selamat datang di Gateway Layanan EmyCMail System.

*PANDUAN UTAMA KENDALI BOT (LINK KLIK AKTIF):*
🎲 /CreateMailR - Pasang Email Temp Acak
✍️ /CreateMailC - Pasang Email Temp Kustom Nama
📥 /CheckInbox - Tarik pesan masuk / kode verifikasi OTP
✉️ /SendMail - Kirim email keluar secara anonim

*SISTEM AKUN & TOPUP:*
👤 /Profile - Cek saldo poin, tier akun, & sisa kuota limit
💳 /TopupPoint - Isi ulang poin & order Tier Premium S / A
🎁 /MisiTiktok - Selesaikan tugas follow developer (*+10 Poin*)
📅 /ClaimDaily - Ambil jatah harian (*+10 Poin* gratis)
`;
  bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
});

// -------------------------------------------------------------
// COMMAND 2: PROFILE
// -------------------------------------------------------------
bot.onText(/\/Profile/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);

  let customLimitText = '';
  let randomLimitText = 'Unlimited (Asal poin cukup)';

  if (isAdmin || user.tier.includes('S-Tier')) {
    customLimitText = 'Unlimited';
    randomLimitText = 'Unlimited';
  } else if (user.tier.includes('A-Tier')) {
    // Gabungan total custom + random limit A-Tier adalah 10
    const totalUsed = (user.dailyUsageCustom || 0) + (user.dailyUsageRandom || 0);
    customLimitText = `${totalUsed} / 10 Pembuatan`;
    randomLimitText = `${totalUsed} / 10 Pembuatan`;
  } else {
    // B-Tier (Free)
    customLimitText = `${user.dailyUsageCustom || 0} / 1 Sesi Hari Ini`;
  }

  const expInfo = user.tierExpiry ? `\n• *Masa Aktif Premium:* \`${new Date(user.tierExpiry).toLocaleDateString('id-ID')}\`` : '';
  
  let emailStatusText = 'Tidak ada sesi aktif';
  if (user.activeEmail && user.emailExpiry) {
    const diffMs = new Date(user.emailExpiry) - new Date();
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      emailStatusText = `\`${user.activeEmail}\`\n• *Sisa Masa Aktif Email:* \`${diffHours} Jam ${diffMins} Menit lagi\``;
    }
  }

  const profileText = `
👤 *USER PROFILE PANEL METADATA*
───────────────────────
• *Nama Pengguna:* ${user.name}
• *ID Telegram:* \`${chatId}\`
• *Saldo Poin:* *${isAdmin ? 'Unlimited (Owner)' : `${user.points} Points`}*
• *Tier Akun:* \`${isAdmin ? 'S-Tier (System Developer)' : user.tier}\`${expInfo}

📊 *SISA LIMIT PEMBUATAN HARI INI:*
• *Email Kustom:* \`${customLimitText}\`
• *Email Acak:* \`${randomLimitText}\`

📥 *STATUS SESI EMAIL SEKARANG:*
• ${emailStatusText}
───────────────────────
`;
  bot.sendMessage(chatId, profileText, { parse_mode: 'Markdown' });
});

// -------------------------------------------------------------
// COMMAND 3: TOPUP POINT
// -------------------------------------------------------------
bot.onText(/\/TopupPoint/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const priceText = `
💳 *GATEWAY TOPUP POIN & PREMIUM TIER LISENSI*
───────────────────────
Silakan pilih paket lisensi premium untuk membuka batasan limit custom email Anda:

📊 *DAFTAR TIER LISENSI EMY_CMAIL:*

• *[ B-Tier ] - Standard Tier (Free)*
  -> Harga: Rp0
  -> Masa Aktif Email: **3 Jam**. Pembuatan Kustom: **1x / Hari** (Acak Bebas). Biaya: 5 Poin Acak / 10 Poin Kustom.

• *[ A-Tier ] - Aero Custom Mail*
  -> Harga: *Rp11.000* (Aktif 2 Minggu)
  -> Masa Aktif Email: **10 Jam**. Total Limit Buat: **10x / Hari**. **DISKON BIAYA POIN 50%** (2 Poin Acak / 5 Poin Kustom).

• *[ S-Tier ] - Infinite Eclipse*
  -> Harga: *Rp15.000* (Aktif 1 Bulan)
  -> Masa Aktif Email: Jauh Lebih Lama (**24 Jam Penuh**). **UNLIMITED** Pembuatan Tanpa Batas & **Bypass 0 Poin (GRATIS SEPUASNYA)**.

───────────────────────
📌 *CARA ORDER / TOPUP POIN:*
1. Scan/Transfer menggunakan kode QRIS resmi developer di atas.
2. Transfer sesuai nominal paket harga Tier pilihan Anda.
3. Kirimkan foto bukti resi transaksi ke Admin Chat Owner: [Klik Kontak Admin](tg://user?id=${OWNER_ID}) untuk proses injeksi tier manual instan!
`;

  bot.sendPhoto(chatId, QRIS_URL, { caption: priceText, parse_mode: 'Markdown' })
    .catch((err) => {
      console.error("Gagal load URL QRIS:", err.message);
      bot.sendMessage(chatId, priceText + `\n\n⚠️ _(Gagal memuat gambar QRIS dari internet, mohon cek URL webhost di Baris 13)_`, { parse_mode: 'Markdown' });
    });
});

// -------------------------------------------------------------
// COMMAND 4 & 5: LAUNCH CORES (RANDOM / CUSTOM RULES)
// -------------------------------------------------------------
bot.onText(/\/CreateMailR/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  delete customNameStorage[chatId]; 

  let cost = 5;
  if (user.tier.includes('A-Tier')) cost = 2;
  if (user.tier.includes('S-Tier') || chatId === String(OWNER_ID)) cost = 0;

  bot.sendMessage(chatId, `🎲 *DEPLOY RANDOM EMAIL NODE*\n\n• Tipe: \`Random Auto\`\n• Biaya: \`${cost} Poin\`\n───────────────────────`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Random Email', callback_data: 'run_mail_random' }]] }
  });
});

bot.onText(/\/CreateMailC(?:\s+(.+))?/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const requestedName = match[1] ? match[1].trim().toLowerCase().replace(/[^a-z0-9.]/g, '') : '';

  if (!requestedName) {
    return bot.sendMessage(chatId, `⚠️ *FORMAT SALAH*\n\nHarap masukkan nama kustom di belakang perintah.\n\n*Cara Ketik:* \`/CreateMailC emyftg\``, { parse_mode: 'Markdown' });
  }

  customNameStorage[chatId] = requestedName;

  let cost = 10;
  if (user.tier.includes('A-Tier')) cost = 5;
  if (user.tier.includes('S-Tier') || chatId === String(OWNER_ID)) cost = 0;

  bot.sendMessage(chatId, `✍️ *DEPLOY CUSTOM EMAIL NODE*\n\n• Nama Pilihan: \`${requestedName}\`\n• Biaya: \`${cost} Poin\`\n───────────────────────`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🚀 Deploy Custom Email', callback_data: 'run_mail_custom' }]] }
  });
});

// -------------------------------------------------------------
// CORE INTERACTIVE DISPATCHER: PROSES API MAIL.TM & EXPIRED LOGIC
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

    // 1. Hitung harga poin berdasarkan tier
    let cost = data === 'run_mail_custom' ? 10 : 5;
    if (user.tier.includes('A-Tier')) cost = data === 'run_mail_custom' ? 5 : 2;
    if (user.tier.includes('S-Tier') || isAdmin) cost = 0;

    // 2. LOGIKA LIMITASI VALIDASI HARIAN TIER BARU
    if (!isAdmin && !user.tier.includes('S-Tier')) {
      // Pengecekan Khusus B-Tier (Free)
      if (user.tier.includes('B-Tier')) {
        if (data === 'run_mail_custom' && user.dailyUsageCustom >= 1) {
          return bot.sendMessage(chatId, `❌ *LIMIT CUSTOM HABIS*\n\nAkun B-Tier (Free) hanya diperbolehkan membuat email custom **1x per hari**. Selesaikan /MisiTiktok atau beli premium via /TopupPoint untuk menambah limit kuota!`, { parse_mode: 'Markdown' });
        }
        // Catatan: Untuk email acak (run_mail_random) di B-tier sengaja dilewati biar bebas tanpa limit asal poin cukup.
      }
      
      // Pengecekan Khusus A-Tier
      if (user.tier.includes('A-Tier')) {
        const currentTotal = (user.dailyUsageCustom || 0) + (user.dailyUsageRandom || 0);
        if (currentTotal >= 10) {
          return bot.sendMessage(chatId, `❌ *LIMIT HARIAN HABIS*\n\nAkun A-Tier Anda sudah mencapai batas kuota maksimal global yaitu **10x pembuatan** per hari.`, { parse_mode: 'Markdown' });
        }
      }

      // Cek apakah poin mencukupi
      if (user.points < cost) {
        return bot.sendMessage(chatId, `❌ *SALDO POIN KURANG*\n\nAnda butuh ${cost} poin. Sisa saldo dompet Anda: ${user.points} Poin.`, { parse_mode: 'Markdown' });
      }
    }

    try {
      const liveMsg = await bot.sendMessage(chatId, `\`[SYSTEM PROLOG]\` Connecting to Mail.tm cloud edge...`, { parse_mode: 'Markdown' });

      const domainsResponse = await axios.get('https://api.mail.tm/domains');
      const availableDomain = domainsResponse.data['hydra:member'][0].domain;

      const finalUsername = (data === 'run_mail_custom' && customNameStorage[chatId]) ? customNameStorage[chatId] : makeRandomString(9);
      const randomPass = makeRandomString(12);
      const generatedEmail = `${finalUsername}@${availableDomain}`;
      delete customNameStorage[chatId];

      // Tembak server mail.tm
      await axios.post('https://api.mail.tm/accounts', { address: generatedEmail, password: randomPass });
      const tokenResponse = await axios.post('https://api.mail.tm/token', { address: generatedEmail, password: randomPass });
      const tokenJwt = tokenResponse.data.token;

      // 3. LOGIKA DURASI MASA AKTIF EMAIL BERDASARKAN REQUEST USER TIER
      let activeHours = 10; // Default A-Tier = 10 Jam
      if (user.tier.includes('B-Tier')) activeHours = 3;  // B-Tier = Baru (3 Jam)
      if (user.tier.includes('S-Tier') || isAdmin) activeHours = 24; // S-Tier = 24 Jam

      const expiryTimestamp = new Date(Date.now() + activeHours * 60 * 60 * 1000);

      // Potong poin & Tambah Hitungan Log Limit Sesuai Jenis
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
───────────────────────
• *Temporary Email:* \`${generatedEmail}\`
• *Masa Aktif Email:* \`${activeHours} Jam Penuh\`
• *Valid Until:* \`${expiryTimestamp.toLocaleTimeString('id-ID')} WIB\`

*LOG METADATA*
• Biaya Pembuatan: ${cost} Poin Terpotong
• Status Akun: \`${user.tier}\`

_Email ini akan otomatis hangus dan terhapus dari sistem setelah melewati durasi aktif di atas! Silakan ketik perintah /CheckInbox untuk menarik OTP._
───────────────────────
`;
      await bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, successTemplate, { parse_mode: 'Markdown' });
      });

    } catch (err) {
      console.error("API Mail.tm Error:", err.message);
      if (err.response && err.response.status === 422) {
        bot.sendMessage(chatId, `❌ *REGISTRATION FAILED*\n\nNama email kustom tersebut sudah diklaim orang asing di internet. Silakan coba lagi dengan kata unik lainnya via /CreateMailC!`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ Gagal memproses pendaftaran akun ke server Mail.tm. Silakan coba sesaat lagi.`);
      }
      delete customNameStorage[chatId];
    }
  }

  // LOGIKA CONFIRMATION TIKTOK MISSION
  if (data === 'tiktok_confirm') {
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    missionStorage[chatId] = 'awaiting_tiktok_username';
    bot.sendMessage(chatId, `✍️ *VERIFIKASI BUKTI*\n\nSilakan ketik dan kirimkan **Username Akun TikTok** Anda yang digunakan untuk mem-follow (Contoh: \`@emy_ftg\`):`);
  }

  // SISI BACKEND DEV APPROVAL ACTION (SAMA SEPERTI SEBELUMNYA)
  if (data.startsWith('approve_tk_')) {
    const targetUserId = data.replace('approve_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    if (db.users[targetUserId] && !db.users[targetUserId].tiktokClaimed) {
      db.users[targetUserId].points += 10;
      db.users[targetUserId].tiktokClaimed = true;
      writeDB(db);
      bot.sendMessage(chatId, `✅ Sukses menyetujui klaim misi TikTok untuk User ID: \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
      bot.sendMessage(targetUserId, `🎉 *MISI FOLLOW DISETUJUI*\n\nKlaim misi TikTok Anda berhasil dikonfirmasi oleh Developer! Akun Anda mendapatkan bonus **+10 Poin** ganjaran gratis.`, { parse_mode: 'Markdown' });
    }
  }

  if (data.startsWith('reject_tk_')) {
    const targetUserId = data.replace('reject_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Klaim misi untuk User ID: \`${targetUserId}\` telah ditolak.`, { parse_mode: 'Markdown' });
    bot.sendMessage(targetUserId, `❌ *MISI FOLLOW DITOLAK*\n\nMaaf, klaim misi Anda ditolak. Pastikan Anda sudah mem-follow akun TikTok asli milik Developer sebelum mengajukan konfirmasi kembali!`, { parse_mode: 'Markdown' });
  }
});

// -------------------------------------------------------------
// COMMAND 6: CHECK INBOX CORE SYSTEM
// -------------------------------------------------------------
bot.onText(/\/CheckInbox/i, async (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name); // Otomatis trigger fungsi filter expired email

  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *SESSIONS EMPTY*\n\nSesi email Anda kosong atau sudah hangus karena melewati batas waktu masa aktif. Silakan deploy email baru lewat /CreateMailR atau /CreateMailC`, { parse_mode: 'Markdown' });
  }

  bot.sendChatAction(chatId, 'typing');

  try {
    const inboxResponse = await axios.get('https://api.mail.tm/messages', {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const messages = inboxResponse.data['hydra:member'];
    if (messages.length === 0) {
      return bot.sendMessage(chatId, `📭 *INBOX EMPTY*\n\nBelum ada email masuk di \`${user.activeEmail}\`.\n\n_Status: Listening / Standby..._`, { parse_mode: 'Markdown' });
    }

    const newestMsgId = messages[0].id;
    const detailsResponse = await axios.get(`https://api.mail.tm/messages/${newestMsgId}`, {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}` }
    });

    const sender = detailsResponse.data.from.address;
    const senderName = detailsResponse.data.from.name || 'Anonymous Sender';
    const subject = detailsResponse.data.subject || 'No Subject';
    const bodyContent = detailsResponse.data.text || detailsResponse.data.intro || '(No Text Content)';

    bot.sendMessage(chatId, `📩 *NEW EMAIL ARRIVED SUCCESS*\n───────────────────\n• *To:* \`${user.activeEmail}\`\n• *From:* ${senderName} <\`${sender}\`>\n• *Subject:* *${subject}*\n\n*CONTENT:*\n\`\`\`text\n${bodyContent.substring(0, 3000)}\n\`\`\`\n───────────────────`, { parse_mode: 'Markdown' });

  } catch (err) {
    bot.sendMessage(chatId, `❌ *GATEWAY SYNC ERROR*\n\nGagal sinkronisasi data dengan server cloud.`, { parse_mode: 'Markdown' });
  }
});

// -------------------------------------------------------------
// COMMAND 7: KIRIM MAIL / DAILY / MISI AUXILIARY
// -------------------------------------------------------------
bot.onText(/\/SendMail\s+(.+)/i, async (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);

  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *ACCESS DENIED*\n\nAnda tidak memiliki sesi email yang aktif saat ini.`, { parse_mode: 'Markdown' });
  }

  const args = match[1].split('|');
  if (args.length < 3) return bot.sendMessage(chatId, `⚠️ *FORMAT SALAH*\n\nGunakan format pemisah pipa: \`/SendMail target@gmail.com | Subjek | Isi pesan\``, { parse_mode: 'Markdown' });

  bot.sendChatAction(chatId, 'typing');
  try {
    await axios.post('https://api.mail.tm/messages', { to: [args[0].trim()], subject: args[1].trim(), text: args[2].trim() }, {
      headers: { 'Authorization': `Bearer ${user.activeEmailToken}`, 'Content-Type': 'application/json' }
    });
    bot.sendMessage(chatId, `✅ *EMAIL DISPATCHED SUCCESS*\n\nPesan berhasil dirouting keluar secara anonim!`, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ *RELAY REJECTED*\n\nGagal mengirim email keluar. Layanan outbound dibatasi oleh node domain gratis.`, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/ClaimDaily/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  const db = readDB();
  db.users[chatId].points += 10;
  writeDB(db);
  bot.sendMessage(chatId, `🎁 *DAILY BONUS CLAIMED*\n\nSelamat! Dompet saldo Anda berhasil diisi *+10 Poin* harian gratis.`);
});

bot.onText(/\/MisiTiktok/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  if (user.tiktokClaimed) return bot.sendMessage(chatId, `❌ *MISSION COMPLETED*\n\nAnda sudah mengklaim bonus misi ini sebelumnya.`, { parse_mode: 'Markdown' });

  bot.sendMessage(chatId, `🎁 *MISI FOLLOW TIKTOK DEVELOPER*\n\nDapatkan bonus *+10 Poin* gratis:\n\n1. Kunjungi dan follow akun Dev: ${TIKTOK_DEV_URL}\n2. Setelah follow, ketik klik tombol konfirmasi di bawah ini:`, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: '✅ Confirm To Developer', callback_data: 'tiktok_confirm' }]] }
  });
});

bot.on('message', (msg) => {
  const chatId = String(msg.chat.id).trim();
  if (!msg.text || msg.text.startsWith('/')) return;
  if (missionStorage[chatId] === 'awaiting_tiktok_username') {
    const tkUser = msg.text.trim();
    delete missionStorage[chatId];
    bot.sendMessage(chatId, `🕒 *VERIFIKASI DIPROSES*\n\nBukti username \`${tkUser}\` sudah diteruskan ke owner untuk direview!`, { parse_mode: 'Markdown' });
    bot.sendMessage(OWNER_ID, `📢 *KLAIM MISI TIKTOK ENTRY*\n\n• User ID: \`${chatId}\`\n• Akun Bukti TikTok: \`${tkUser}\``, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '✅ Setujui', callback_data: `approve_tk_${chatId}` }, { text: '❌ Tolak', callback_data: `reject_tk_${chatId}` }]] }
    });
  }
});

console.log(`=================================================\n       CORE SYSTEM v8.0 ONLINE (STABLE NODE)\n=================================================`);
