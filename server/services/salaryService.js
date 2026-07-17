const PDFDocument = require('pdfkit');
const nodemailer  = require('nodemailer');
const path        = require('path');
const fs          = require('fs');

const COMPANY = {
  name:    'Mathumithan Hardware',
  address: '123 Main Street, Colombo, Sri Lanka',
  phone:   '+94 11 234 5678',
  email:   'info@mathumithanhardware.lk'
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ── PDF Generation ──────────────────────────────────────────────────────────
const generatePayslipPDF = (paymentData) => {
  return new Promise((resolve, reject) => {
    const dir = path.join(__dirname, '..', 'uploads', 'payslips');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename  = `payslip_${paymentData.salary_payment_id}_${paymentData.payment_year}_${String(paymentData.payment_month).padStart(2,'0')}.pdf`;
    const filepath  = path.join(dir, filename);
    const doc       = new PDFDocument({ margin: 50, size: 'A4' });
    const stream    = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header bar
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text(`${COMPANY.phone}  |  ${COMPANY.email}`, 50, 60);
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
       .text('PAYSLIP', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');

    // Payslip meta row
    doc.y = 110;
    doc.fontSize(9).font('Helvetica')
       .text(`Payslip No: #${String(paymentData.salary_payment_id).padStart(6,'0')}`, 50, doc.y)
       .text(`Period: ${MONTHS[paymentData.payment_month - 1]} ${paymentData.payment_year}`, 300, doc.y)
       .text(`Generated: ${new Date().toLocaleDateString('en-LK')}`, 50, doc.y + 14)
       .text(`Payment Date: ${paymentData.payment_date ? new Date(paymentData.payment_date).toLocaleDateString('en-LK') : '—'}`, 300, doc.y + 14);

    doc.y += 45;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 12;

    // Employee Info section
    const emp = paymentData.employee;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#8b3a3a').text('Employee Information', 50, doc.y);
    doc.y += 18;
    const empInfo = [
      ['Employee ID', `EMP-${String(emp.employee_id).padStart(4,'0')}`],
      ['Name',        `${emp.first_name} ${emp.last_name}`],
      ['Department',  emp.department?.department_name || '—'],
      ['Position',    emp.position || '—'],
    ];
    empInfo.forEach(([label, val]) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#555').text(label + ':', 50, doc.y, { width: 130 });
      doc.font('Helvetica').fillColor('#333').text(val, 185, doc.y);
      doc.y += 16;
    });

    doc.y += 8;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 12;

    // Salary breakdown
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#8b3a3a').text('Salary Breakdown', 50, doc.y);
    doc.y += 18;

    const rows = [
      ['Basic Salary',      `LKR ${Number(paymentData.basic_salary).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,   false],
      ['Bonus Amount',      `LKR ${Number(paymentData.bonus_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,   false],
      ['Deductions',        `LKR ${Number(paymentData.deduction_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, false],
      ['Net Salary (Final)',`LKR ${Number(paymentData.final_salary).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,   true],
    ];

    rows.forEach(([label, val, highlight]) => {
      if (highlight) {
        doc.rect(50, doc.y - 4, 495, 22).fill('#fff5f5');
        doc.fillColor('#8b3a3a').fontSize(10).font('Helvetica-Bold').text(label, 55, doc.y, { width: 300 });
        doc.text(val, 355, doc.y, { width: 180, align: 'right' });
      } else {
        doc.fillColor('#555').fontSize(9).font('Helvetica-Bold').text(label + ':', 55, doc.y, { width: 300 });
        doc.fillColor('#333').font('Helvetica').text(val, 355, doc.y, { width: 180, align: 'right' });
      }
      doc.fillColor('#333333');
      doc.y += 22;
    });

    // Payment Method & Remarks
    doc.y += 6;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 12;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555').text('Payment Method:', 50, doc.y, { width: 130 });
    doc.font('Helvetica').fillColor('#333').text(paymentData.payment_method || '—', 185, doc.y);
    doc.y += 16;
    if (paymentData.remarks) {
      doc.font('Helvetica-Bold').fillColor('#555').text('Remarks:', 50, doc.y, { width: 130 });
      doc.font('Helvetica').fillColor('#333').text(paymentData.remarks, 185, doc.y, { width: 360 });
      doc.y += 30;
    }

    // Signature section
    doc.y = Math.max(doc.y + 40, 680);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#999').stroke();
    doc.moveTo(345, doc.y).lineTo(495, doc.y).strokeColor('#999').stroke();
    doc.y += 6;
    doc.fontSize(9).fillColor('#555')
       .text('Employee Signature', 50, doc.y, { width: 150, align: 'center' })
       .text('Authorized Signature', 345, doc.y, { width: 150, align: 'center' });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('This is a computer-generated payslip. No physical signature is required.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });

    doc.end();
    stream.on('finish', () => resolve(`uploads/payslips/${filename}`));
    stream.on('error', reject);
  });
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
    });

    const monthLabel = `${MONTHS[(paymentData.payment_month || 1) - 1] || 'Salary'} ${paymentData.payment_year || new Date().getFullYear()}`;
    const absPath    = pdfPath ? path.join(__dirname, '..', pdfPath) : null;
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
        <p style="margin:24px 0 0;font-size:13px;color:#aaa;">Your detailed payslip PDF is attached to this email.</p>
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
      attachments: absPath && fs.existsSync(absPath)
        ? [{ filename: `Payslip_${monthLabel.replace(' ', '_')}_${employeeName.replace(' ', '_')}.pdf`, path: absPath }]
        : []
    });

    return { success: true };
  } catch (error) {
    console.error('Payslip email delivery failed:', error.message);
    return { success: false, skipped: false, reason: error.message };
  }
};

module.exports = { generatePayslipPDF, sendPayslipEmail };
