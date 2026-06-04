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
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const monthLabel = `${MONTHS[paymentData.payment_month - 1]} ${paymentData.payment_year}`;
  const absPath    = path.join(__dirname, '..', pdfPath);

  await transporter.sendMail({
    from:    `"${COMPANY.name}" <${process.env.EMAIL_USER}>`,
    to:      employeeEmail,
    subject: 'Salary Payment Confirmation',
    text: `Dear ${employeeName},\n\nYour salary for ${monthLabel} has been successfully credited.\n\nAmount Paid: LKR ${Number(paymentData.final_salary).toLocaleString('en-LK', { minimumFractionDigits: 2 })}\nPayment Date: ${paymentData.payment_date}\n\nYour payslip is attached to this email.\n\nThank you.\n\nRegards,\nManagement`,
    attachments: fs.existsSync(absPath)
      ? [{ filename: path.basename(absPath), path: absPath }]
      : []
  });
};

module.exports = { generatePayslipPDF, sendPayslipEmail };
