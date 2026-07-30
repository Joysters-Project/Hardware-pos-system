const nodemailer = require('nodemailer');

const COMPANY = {
  name:    'Mathumithan Hardware',
  address: '123 Main Street, Colombo, Sri Lanka',
  phone:   '+94 11 234 5678',
  email:   'info@mathumithanhardware.lk'
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ── PDF Generation ──────────────────────────────────────────────────────────
const generatePayslipPDF = async () => {
  return null;
};

// ── Email Notification ───────────────────────────────────────────────────────
const sendPayslipEmail = async (employeeEmail, employeeName, paymentData, pdfPath) => {
  const emailUser = process.env.SMTP_EMAIL || process.env.EMAIL_USER;
  const emailPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.warn('Email credentials not configured — skipping payslip email.');
    return { success: false, skipped: true, reason: 'missing-credentials' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: emailUser, pass: emailPass },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const monthLabel = `${MONTHS[(paymentData.payment_month || 1) - 1] || 'Salary'} ${paymentData.payment_year || new Date().getFullYear()}`;
    const empId      = String(paymentData.employee?.employee_id || paymentData.employee_id || '').padStart(4, '0');

    const htmlBody = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:28px 32px;">
        <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Salary Payment Confirmation</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${employeeName}</strong>,</p>
        <p style="font-size:14px;color:#555;margin:0 0 24px;">Your salary for <strong>${monthLabel}</strong> has been successfully processed. Please find the details below:</p>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
          <tr style="background:#fdf5f5;">
            <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;width:45%;">Employee ID</td>
            <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">EMP-${empId}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Pay Period</td>
            <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${monthLabel}</td>
          </tr>
          <tr style="background:#fdf5f5;">
            <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Basic Salary</td>
            <td style="padding:12px 16px;font-size:13px;color:#333;">LKR ${Number(paymentData.basic_salary).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Bonus</td>
            <td style="padding:12px 16px;font-size:13px;color:#2e7d32;">+LKR ${Number(paymentData.bonus_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#fdf5f5;">
            <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Deductions</td>
            <td style="padding:12px 16px;font-size:13px;color:#c62828;">-LKR ${Number(paymentData.deduction_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:linear-gradient(135deg,#e8f4fd,#dbeeff);">
            <td style="padding:14px 16px;font-size:14px;color:#1565c0;font-weight:700;">Net Salary Paid</td>
            <td style="padding:14px 16px;font-size:16px;color:#1565c0;font-weight:700;">LKR ${Number(paymentData.final_salary).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#888;">Payment Method: <strong>${paymentData.payment_method || '—'}</strong></p>
        ${paymentData.remarks ? `<p style="margin:8px 0 0;font-size:13px;color:#888;">Remarks: <em>${paymentData.remarks}</em></p>` : ''}
        <p style="margin:24px 0 0;font-size:13px;color:#aaa;">No PDF attachment is generated for this salary notification.</p>
      </div>
      <div style="background:#f7f7f7;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
      </div>
    </div>
  `;

    await transporter.sendMail({
      from:    `"${process.env.EMAIL_FROM_NAME || COMPANY.name}" <${process.env.EMAIL_FROM_EMAIL || emailUser}>`,
      to:      employeeEmail,
      subject: `Salary Payment Confirmation — ${monthLabel}`,
      html:    htmlBody,
      attachments: []
    });

    return { success: true };
  } catch (error) {
    console.error('Payslip email delivery failed:', error.message);
    return { success: false, skipped: false, reason: error.message };
  }
};

module.exports = { generatePayslipPDF, sendPayslipEmail };
