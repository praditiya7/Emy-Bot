// =============================================================
// TELEGRAM MAIL GATEWAY CORE ENGINE v15.0 - PRODUCTION STABLE
// =============================================================
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = '8829940673:AAHqA6_LjlON9DXqMfUTkZ68__MC1O8ZR2I'; 
const OWNER_ID = '8430290683'; 
const TIKTOK_DEV_URL = 'https://www.tiktok.com/@emyjbl_'; 
const QRIS_URL = 'https://qu.ax/g1eRh'; 

const bot = new TelegramBot(TOKEN, { polling: true });
const dbPath = path.join(__dirname, 'database.json');

const customNameStorage = {};
const missionStorage = {};

// REGISTRASI PERINTAH BLUE MENU
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
// DATABASE SYSTEM
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

  if (db.users[chatId].tierExpiry && new Date() > new Date(db.users[chatId].tierExpiry)) {
    db.users[chatId].tier = 'B-Tier (Standard Free)';
    db.users[chatId].tierExpiry = null;
    writeDB(db);
    bot.sendMessage(chatId, `⚠️ *LISENSI SUBSCRIPTION EXPIRED*\n\nMasa langganan Premium Anda telah habis. Status Anda otomatis diturunkan kembali ke B-Tier (Free).`, { parse_mode: 'Markdown' }).catch(()=>{});
  }

  if (db.users[chatId].activeEmail && db.users[chatId].emailExpiry && new Date() > new Date(db.users[chatId].emailExpiry)) {
    db.users[chatId].activeEmail = null;
    db.users[chatId].activeEmailToken = null;
    db.users[chatId].emailExpiry = null;
    writeDB(db);
    bot.sendMessage(chatId, `⏰ *EMAIL TEMPORARY EXPIRED*\n\nSesi email Anda telah melewati batas waktu masa aktif dan dihancurkan oleh sistem. Silakan deploy email baru!`, { parse_mode: 'Markdown' }).catch(()=>{});
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
// COMMAND HANDLERS
// -------------------------------------------------------------
bot.onText(/\/start/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  const text = `⚙️ *PANDUAN UTAMA KENDALI BOT*\n──────────────────────────────\n🎲 /CreateMailR \`───\` Pasang Email Temp Acak\n✍️ /CreateMailC \`───\` Pasang Email Temp Kustom\n📥 /CheckInbox \`────\` Tarik Pesan Masuk / OTP\n✉️ /SendMail \`──────\` Kirim Email Keluar Anonim\n\n💳 *SISTEM AKUN & TOPUP POIN*\n──────────────────────────────\n👤 /Profile \`────────\` Cek Saldo, Tier & Limit\n💵 /TopupPoint \`─────\` Isi Poin & Order Premium\n🎁 /MisiTiktok \`─────\` Misi Follow Dev (*+10 Poin*)\n📅 /ClaimDaily \`─────\` Klaim Jatah Poin Harian (*+10*)\n──────────────────────────────\n_Klik salah satu perintah berwarna biru di atas untuk mengoperasikan fitur bot secara instan._`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/menu/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  const text = `⚙️ *PANDUAN UTAMA KENDALI BOT*\n──────────────────────────────\n🎲 /CreateMailR \`───\` Pasang Email Temp Acak\n✍️ /CreateMailC \`───\` Pasang Email Temp Kustom\n📥 /CheckInbox \`────\` Tarik Pesan Masuk / OTP\n✉️ /SendMail \`──────\` Kirim Email Keluar Anonim\n\n💳 *SISTEM AKUN & TOPUP POIN*\n──────────────────────────────\n👤 /Profile \`────────\` Cek Saldo, Tier & Limit\n💵 /TopupPoint \`─────\` Isi Poin & Order Premium\n🎁 /MisiTiktok \`─────\` Misi Follow Dev (*+10 Poin*)\n📅 /ClaimDaily \`─────\` Klaim Jatah Poin Harian (*+10*)\n──────────────────────────────\n_Klik salah satu perintah berwarna biru di atas untuk mengoperasikan fitur bot secara instan._`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/profile/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === String(OWNER_ID);

  let customLimitText = user.dailyUsageCustom + ' / 1 Sesi Hari Ini';
  let randomLimitText = 'Unlimited (Asal poin cukup)';

  if (isAdmin || user.tier.includes('S-Tier')) {
    customLimitText = 'Unlimited';
    randomLimitText = 'Unlimited';
  } else if (user.tier.includes('A-Tier')) {
    const totalUsed = (user.dailyUsageCustom || 0) + (user.dailyUsageRandom || 0);
    customLimitText = `${totalUsed} / 10 Pembuatan`;
    randomLimitText = `${totalUsed} / 10 Pembuatan`;
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

  const profileText = `👤 *USER DATA METADATA PANEL*\n──────────────────────────────\n🔹 *Nama Pengguna :* ${user.name}\n🔹 *ID Telegram   :* \`${chatId}\`\n🔹 *Saldo Poin    :* *${isAdmin ? 'Unlimited (Owner)' : `${user.points} Points`}*\n🔹 *Tier Lisensi  :* \`${isAdmin ? 'S-Tier (Developer)' : user.tier}\`${expInfo}\n\n📊 *SISA LIMIT PEMBUATAN HARI INI*\n──────────────────────────────\n🔹 *Email Kustom  :* \`${customLimitText}\`\n🔹 *Email Acak    :* \`${randomLimitText}\`\n\n📥 *STATUS EMAIL TEMPORARY*\n──────────────────────────────\n🔹 *Email Aktif   :* ${emailStatusText}\n──────────────────────────────`;
  bot.sendMessage(chatId, profileText, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/topuppoint/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);
  const priceText = `💳 *LIST TOPUP POIN & TIER PREMIUM*\n──────────────────────────────\n👑 *[ B-Tier ] - Standard Free (Default)*\n ├─ Harga : Rp0\n ├─ Masa Aktif Email : *3 Jam*\n └─ Limit Custom : *1x / Hari* (Acak Bebas)\n\n👑 *[ A-Tier ] - Aero Custom Mail*\n ├─ Harga : *Rp11.000* (Aktif 14 Hari)\n ├─ Masa Aktif Email : *10 Jam*\n ├─ Total Limit Buat : *10x / Hari*\n └─ *DISKON POTONGAN POIN 50%*\n\n👑 *[ S-Tier ] - Infinite Eclipse*\n ├─ Harga : *Rp15.000* (Aktif 30 Hari)\n ├─ Masa Aktif Email : *24 Jam Penuh*\n └─ *UNLIMITED & BYPASS 0 POIN (GRATIS SEPUASNYA)*\n──────────────────────────────\n📌 *PROSEDUR PEMBAYARAN:*\n1. Scan kode QRIS resmi developer di atas.\n2. Kirim bukti resi transfer sukses ke kontak Admin Owner: [Klik Hubungi Admin](tg://user?id=${OWNER_ID}) untuk aktivasi instan.`;
  bot.sendPhoto(chatId, QRIS_URL, { caption: priceText, parse_mode: 'Markdown' }).catch(() => {
    bot.sendMessage(chatId, priceText + `\n\n⚠️ _(Gagal memuat gambar QRIS)_`, { parse_mode: 'Markdown' }).catch(()=>{});
  });
});

bot.onText(/\/claimdaily/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const db = readDB();
  verifyUser(chatId, msg.from.first_name);
  db.users[chatId].points += 10;
  writeDB(db);
  bot.sendMessage(chatId, `🎁 *DAILY BONUS CLAIMED*\n\nSelamat! Rekening saldo Anda berhasil ditambahkan *+10 Poin* gratis harian.`).catch(()=>{});
});

bot.onText(/\/misitiktok/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  if (user.tiktokClaimed) {
    return bot.sendMessage(chatId, `❌ *MISSION COMPLETED*\n\nAnda sudah menuntaskan jatah hadiah misi ini sebelumnya.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
  const tiktokText = `🎁 *MISI GRATIS BONUS POIN DEVS*\n──────────────────────────────\nDapatkan bonus reward instan sebesar *+10 Poin* gratis langsung masuk dompet saldo Anda dengan langkah mudah:\n\n1. Kunjungi tautan akun Dev: ${TIKTOK_DEV_URL}\n2. Klik tombol *Follow / Ikuti* akun resmi kami.\n3. Jika sudah selesai, kembali ke bot ini dan klik tombol konfirmasi di bawah ini:\n──────────────────────────────`;
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

bot.onText(/\/checkinbox/i, async (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name); 
  if (!user.activeEmailToken || !user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *SESSIONS NOT FOUND*\n\nSesi email Anda kosong atau sudah kedaluwarsa. Silakan deploy email baru.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
  bot.sendChatAction(chatId, 'typing').catch(()=>{});
  try {
    const res = await axios.get('https://api.mail.tm/messages', { headers: { 'Authorization': `Bearer ${user.activeEmailToken}` } });
    const messages = res.data['hydra:member'];
    if (messages.length === 0) {
      return bot.sendMessage(chatId, `📭 *INBOX EMPTY*\n──────────────────────────────\nBelum ada email / kode OTP masuk di \`${user.activeEmail}\`.\n──────────────────────────────\n_Status: Listening / Standby..._`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
    const details = await axios.get(`https://api.mail.tm/messages/${messages[0].id}`, { headers: { 'Authorization': `Bearer ${user.activeEmailToken}` } });
    const text = `📩 *NEW EMAIL INBOUND ARRIVED*\n──────────────────────────────\n• *Dari   :* ${details.data.from.name || 'Anon'} <\`${details.data.from.address}\`>\n• *Judul  :* *${details.data.subject || 'No Subject'}*\n\n*ISI PESAN / KODE OTP:*\n\`\`\`text\n${(details.data.text || details.data.intro || '').substring(0, 3000)}\n\`\`\`\n──────────────────────────────`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(()=>{});
  } catch (err) {
    bot.sendMessage(chatId, `❌ *GATEWAY SYNC ERROR*\n\nGagal terhubung sinkronisasi ke server cloud.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
});

bot.onText(/\/sendmail/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  bot.sendMessage(chatId, `🛠️ *DEVELOPER RESTRICTED FEATURE*\n──────────────────────────────\nMaaf, fitur pengiriman surat keluar (\`/SendMail\`) saat ini berada dalam status *Maintenance sandbox mode*.\n──────────────────────────────`, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/setpoint\s+(\d+)\s+(\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== String(OWNER_ID)) return;
  const targetId = match[1].trim();
  const points = parseInt(match[2].trim());
  const db = readDB();
  if (!db.users[targetId]) return bot.sendMessage(chatId, `❌ User ID tidak ditemukan.`).catch(()=>{});
  db.users[targetId].points += points;
  writeDB(db);
  bot.sendMessage(chatId, `✅ *SUKSES INJEKSI POIN*\n\nUser ID: \`${targetId}\`\nJumlah Tambahan: \`+${points} Poin\``, { parse_mode: 'Markdown' }).catch(()=>{});
  bot.sendMessage(targetId, `🎉 *SALDO REFILL SUCCESS*\n\nAdmin telah menambahkan *+${points} Poin* ke dalam dompet Anda. Cek via /Profile!`, { parse_mode: 'Markdown' }).catch(()=>{});
});

bot.onText(/\/settier\s+(\d+)\s+([A-Z])\s+(\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== String(OWNER_ID)) return;
  const targetId = match[1].trim();
  const tier = match[2].trim().toUpperCase();
  const days = parseInt(match[3].trim());
  const db = readDB();
  if (!db.users[targetId]) return bot.sendMessage(chatId, `❌ User ID tidak ditemukan.`).catch(()=>{});
  const exp = new Date();
  exp.setDate(exp.getDate() + days);
  db.users[targetId].tier = tier === 'A' ? 'A-Tier (Aero Premium)' : 'S-Tier (Infinite Eclipse)';
  db.users[targetId].tierExpiry = exp.toISOString();
  writeDB(db);
  bot.sendMessage(chatId, `✅ *UPGRADE PREMIUM SUKSES*`, { parse_mode: 'Markdown' }).catch(()=>{});
  bot.sendMessage(targetId, `🎉 *UPGRADE TIER PREMIUM SUKSES*\n\nAkun Anda telah ditingkatkan menjadi *${db.users[targetId].tier}* selama *${days} hari* oleh Admin!`, { parse_mode: 'Markdown' }).catch(()=>{});
});

// -------------------------------------------------------------
// CALLBACK INTERFACE DISPATCHER
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
      const domRes = await axios.get('https://api.mail.tm/domains');
      const domain = domRes.data['hydra:member'][0].domain;
      const username = (data === 'run_mail_custom' && customNameStorage[chatId]) ? customNameStorage[chatId] : makeRandomString(9);
      const pass = makeRandomString(12);
      const email = `${username}@${domain}`;
      delete customNameStorage[chatId];

      await axios.post('https://api.mail.tm/accounts', { address: email, password: pass });
      const tokRes = await axios.post('https://api.mail.tm/token', { address: email, password: pass });
      
      let hours = user.tier.includes('B-Tier') ? 3 : (user.tier.includes('S-Tier') || isAdmin ? 24 : 10);
      const exp = new Date(Date.now() + hours * 60 * 60 * 1000);

      db.users[chatId].points -= cost;
      db.users[chatId].activeEmail = email;
      db.users[chatId].activeEmailToken = tokRes.data.token;
      db.users[chatId].emailExpiry = exp.toISOString();
      
      if (data === 'run_mail_custom') {
        db.users[chatId].dailyUsageCustom = (db.users[chatId].dailyUsageCustom || 0) + 1;
      } else {
        db.users[chatId].dailyUsageRandom = (db.users[chatId].dailyUsageRandom || 0) + 1;
      }
      writeDB(db);

      const successTemplate = `\n✅ *TEMP MAIL DEPLOYED SUCCESS*\n──────────────────────────────\n• *Email Temp :* \`${email}\`\n• *Durasi Aktif :* \`${hours} Jam Penuh\`\n• *Masa Berlaku :* \`${exp.toLocaleTimeString('id-ID')} WIB\`\n──────────────────────────────\n_Email ini akan otomatis hancur secara permanen dari server setelah batas waktu berlalu. Jalankan /CheckInbox untuk melihat pesan masuk._`;
      bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
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
    const target = data.replace('approve_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    if (db.users[target] && !db.users[target].tiktokClaimed) {
      db.users[target].points += 10;
      db.users[target].tiktokClaimed = true;
      writeDB(db);
      bot.sendMessage(chatId, `✅ Berhasil menyetujui klaim misi TikTok untuk User ID: \`${target}\`.`).catch(()=>{});
      bot.sendMessage(target, `🎉 *MISI DISUBMIT & DISETUJUI*\n\nKlaim misi TikTok Anda disetujui oleh Owner! Saldo Anda bertambah *+10 Poin* gratis.`, { parse_mode: 'Markdown' }).catch(()=>{});
    }
  }

  if (data.startsWith('reject_tk_')) {
    const target = data.replace('reject_tk_', '');
    bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Klaim misi untuk User ID: \`${target}\` telah ditolak.`).catch(()=>{});
    bot.sendMessage(target, `❌ *MISI FOLLOW DITOLAK*\n\nMaaf, pengajuan klaim poin Anda ditolak oleh Developer.`, { parse_mode: 'Markdown' }).catch(()=>{});
  }
});

// -------------------------------------------------------------
// TEXT INPUT LISTENER
// -------------------------------------------------------------
bot.on('message', (msg) => {
  const chatId = String(msg.chat.id).trim();
  if (!msg.text || msg.text.startsWith('/')) return;
  
  if (missionStorage[chatId] === 'awaiting_tiktok_username') {
    const tkUser = msg.text.trim();
    delete missionStorage[chatId];
    verifyUser(chatId, msg.from.first_name);
    
    bot.sendMessage(chatId, `🕒 VERIFIKASI TIKTOK SENT\n\nBukti akun "${tkUser}" sudah dikirimkan. Harap tunggu proses verifikasi manual oleh Owner.`).catch(()=>{});
    bot.sendMessage(OWNER_ID, `📢 KLAIM MISI TIKTOK REQUEST\n\n• User ID : ${chatId}\n• Nama Akun : ${msg.from.first_name || 'User'}\n• Bukti TikTok : ${tkUser}`, {
      reply_markup: { inline_keyboard: [[{ text: '✅ Setujui (+10 Poin)', callback_data: `approve_tk_${chatId}` }, { text: '❌ Tolak', callback_data: `reject_tk_${chatId}` }]] }
    }).catch(()=>{});
  }
});

// SYSTEM CRASH SHIELD
process.on('uncaughtException', (err) => {
  console.error('Sistem mendeteksi error tidak tertangkap:', err.message);
});

console.log(`=================================================\n       CORE SYSTEM v15.0 FINAL RUNNING ACTIVE\n=================================================`);
