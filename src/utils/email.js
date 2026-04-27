const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const emailTemplates = {
  studentWelcome: (student, enrollment, classData) => ({
    subject: `🎵 Selamat Datang di AksaraNada, ${student.name}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: 'Georgia', serif; background: #0a0a0a; }
    .container { max-width: 600px; margin: 0 auto; background: #111; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 50px 40px; text-align: center; }
    .logo { color: #c9a84c; font-size: 32px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; }
    .logo-sub { color: #8a7a5a; font-size: 12px; letter-spacing: 8px; margin-top: 5px; }
    .divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 20px auto; }
    .body { padding: 50px 40px; }
    .greeting { color: #c9a84c; font-size: 22px; font-weight: 600; margin-bottom: 20px; }
    .text { color: #d0d0d0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
    .highlight-box { background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #c9a84c33; border-left: 3px solid #c9a84c; padding: 25px; border-radius: 8px; margin: 30px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .info-label { color: #8a7a5a; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .info-value { color: #c9a84c; font-size: 14px; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #c9a84c, #a8893c); color: #0a0a0a; padding: 14px 35px; border-radius: 4px; text-decoration: none; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-size: 13px; margin: 20px 0; }
    .footer { background: #0a0a0a; padding: 30px 40px; text-align: center; border-top: 1px solid #c9a84c22; }
    .footer-text { color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AksaraNada</div>
      <div class="logo-sub">Music School & Studio</div>
      <div class="divider"></div>
    </div>
    <div class="body">
      <div class="greeting">Selamat Datang, ${student.name}! 🎶</div>
      <p class="text">
        Kami dengan bangga menyambut Anda sebagai bagian dari keluarga besar <strong style="color:#c9a84c">AksaraNada</strong>. 
        Perjalanan musik Anda yang luar biasa dimulai dari sini — tempat di mana melodi bertemu dengan teknik, 
        dan passion bertemu dengan dedikasi.
      </p>
      <div class="highlight-box">
        <table>
          <tr><td><span class="info-label">Kelas</span></td><td style="text-align:right"><span class="info-value">${classData.name}</span></td></tr>
          <tr><td><span class="info-label">Instrumen</span></td><td style="text-align:right"><span class="info-value">${classData.instrument?.name || "-"}</span></td></tr>
          <tr><td><span class="info-label">Lokasi</span></td><td style="text-align:right"><span class="info-value">${enrollment.locationType.replace(/_/g, " ")}</span></td></tr>
        </table>
      </div>
      ${
        classData.groupLink
          ? `
      <p class="text">Bergabunglah dengan grup kelas Anda untuk informasi jadwal dan materi pembelajaran:</p>
      <div style="text-align: center;">
        <a href="${classData.groupLink}" class="btn">Bergabung ke Grup Kelas</a>
      </div>
      `
          : ""
      }
      <p class="text">
        Tim kami akan menghubungi Anda dalam waktu dekat untuk konfirmasi jadwal dan persiapan kelas pertama. 
        Jika ada pertanyaan, silakan reply email ini atau hubungi WhatsApp kami.
      </p>
      <p class="text" style="color: #8a7a5a; font-style: italic;">
        "Music gives a soul to the universe, wings to the mind, flight to the imagination, and life to everything." — Plato
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">© ${new Date().getFullYear()} AksaraNada Music School. All rights reserved.</p>
      <p class="footer-text" style="margin-top: 5px;">
        <a href="mailto:${process.env.GMAIL_USER}" style="color: #c9a84c; text-decoration: none;">${process.env.GMAIL_USER}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  }),

  studentNotifyAdmin: (student, enrollment, classData) => ({
    subject: `[AksaraNada] 🔔 Pendaftar Baru: ${student.name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; }
  .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
  .header { background: #1a1a2e; color: #c9a84c; padding: 25px; font-size: 20px; font-weight: bold; }
  .body { padding: 30px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
  .label { color: #666; width: 40%; }
  .value { color: #333; font-weight: 600; }
  .badge { background: #c9a84c; color: #1a1a2e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
</style>
</head>
<body>
<div class="container">
  <div class="header">🎵 Pendaftar Baru Masuk!</div>
  <div class="body">
    <p style="color:#666; margin-bottom: 20px;">Ada murid baru yang mendaftar melalui sistem AksaraNada.</p>
    <table>
      <tr><td class="label">Nama</td><td class="value">${student.name}</td></tr>
      <tr><td class="label">Usia</td><td class="value">${student.age} tahun</td></tr>
      <tr><td class="label">Email</td><td class="value">${student.email}</td></tr>
      <tr><td class="label">WhatsApp</td><td class="value">${student.whatsapp}</td></tr>
      <tr><td class="label">Kelas</td><td class="value">${classData.name}</td></tr>
      <tr><td class="label">Instrumen</td><td class="value">${classData.instrument?.name || "-"}</td></tr>
      <tr><td class="label">Tipe Kelas</td><td class="value"><span class="badge">${enrollment.locationType.replace(/_/g, " ")}</span></td></tr>
      <tr><td class="label">Waktu Daftar</td><td class="value">${new Date().toLocaleString("id-ID")}</td></tr>
    </table>
  </div>
</div>
</body>
</html>`,
  }),

  teacherApplicationConfirm: (teacher) => ({
    subject: `[AksaraNada] Terima Kasih atas Lamaran Anda, ${teacher.name}!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { margin: 0; padding: 0; font-family: 'Georgia', serif; background: #0a0a0a; }
  .container { max-width: 600px; margin: 0 auto; background: #111; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 50px 40px; text-align: center; }
  .logo { color: #c9a84c; font-size: 32px; font-weight: 700; letter-spacing: 4px; }
  .divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 20px auto; }
  .body { padding: 50px 40px; }
  .text { color: #d0d0d0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
  .footer { background: #0a0a0a; padding: 30px 40px; text-align: center; border-top: 1px solid #c9a84c22; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">AksaraNada</div>
    <div style="color:#8a7a5a; font-size:12px; letter-spacing:6px; margin-top:5px;">MUSIC SCHOOL</div>
    <div class="divider"></div>
  </div>
  <div class="body">
    <p style="color:#c9a84c; font-size:22px; font-weight:600; margin-bottom:20px;">Terima kasih, ${teacher.name}!</p>
    <p class="text">
      Lamaran Anda sebagai pengajar di <strong style="color:#c9a84c">AksaraNada</strong> telah kami terima dengan baik. 
      Kami sangat menghargai antusiasme dan dedikasi Anda untuk berbagi keindahan musik kepada murid-murid kami.
    </p>
    <p class="text">
      Tim kami sedang meninjau profil dan CV Anda. Kami akan menghubungi Anda melalui nomor telepon atau email 
      yang Anda daftarkan dalam waktu <strong style="color:#c9a84c">3-5 hari kerja</strong>.
    </p>
    <p class="text" style="color:#8a7a5a; font-style:italic;">
      "Teaching music is not my main purpose. I want to make good citizens. If children hear fine music from the day of their birth, and learn to play it, they develop sensitivity, discipline and endurance." — Shinichi Suzuki
    </p>
  </div>
  <div class="footer">
    <p style="color:#555; font-size:12px;">© ${new Date().getFullYear()} AksaraNada Music School</p>
  </div>
</div>
</body>
</html>`,
  }),

  teacherApplicationNotifyAdmin: (teacher) => ({
    subject: `[AksaraNada] 🎸 Lamaran Guru Baru: ${teacher.name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; }
  .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
  .header { background: #0f3460; color: #c9a84c; padding: 25px; font-size: 20px; font-weight: bold; }
  .body { padding: 30px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
  .label { color: #666; width: 40%; }
  .value { color: #333; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <div class="header">🎸 Lamaran Guru Baru!</div>
  <div class="body">
    <table>
      <tr><td class="label">Nama</td><td class="value">${teacher.name}</td></tr>
      <tr><td class="label">Email</td><td class="value">${teacher.email}</td></tr>
      <tr><td class="label">Telepon</td><td class="value">${teacher.phone}</td></tr>
      <tr><td class="label">Pengalaman</td><td class="value">${teacher.experience} tahun</td></tr>
      <tr><td class="label">Instrumen</td><td class="value">${teacher.instruments}</td></tr>
      <tr><td class="label">Waktu Lamar</td><td class="value">${new Date().toLocaleString("id-ID")}</td></tr>
    </table>
    <p style="color:#666; margin-top:20px; font-size:13px;">Silakan login ke dashboard AksaraNada untuk melihat detail dan CV lamaran.</p>
  </div>
</div>
</body>
</html>`,
  }),
};

const sendEmail = async (to, template) => {
  const mailOptions = {
    from: `"${process.env.GMAIL_FROM_NAME || "AksaraNada"}" <${process.env.GMAIL_USER}>`,
    to,
    subject: template.subject,
    html: template.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail, emailTemplates };
