const nodemailer = require('nodemailer');
const { email_logs } = require('../models');
const pdfService = require('./pdfService');

const COMPANY = {
  name:    'Mathumithan Hardware',
  address: '123 Main Street, Colombo, Sri Lanka',
  phone:   '+94 11 234 5678',
  email:   'info@mathumithanhardware.lk'
};

const createTransporter = () => {
  const emailUser = process.env.SMTP_EMAIL || process.env.EMAIL_USER;
  const emailPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('[EmailService] SMTP credentials not configured. Email will be logged as failed.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '587' ? false : true,
    auth: { user: emailUser, pass: emailPass },
    family: 4,
  });
};

const logEmail = async (recipient, subject, type, refType, refId, status, errorMsg = null) => {
  try {
    await email_logs.create({
      recipient_email: recipient,
      subject,
      type,
      reference_type: refType,
      reference_id: refId,
      status,
      error_message: errorMsg
    });
  } catch (err) {
    console.error(`[EmailService] Failed to write email log: ${err.message}`);
  }
};

/**
 * sendPOCreatedEmail
 */
const sendPOCreatedEmail = async (po) => {
  const supplier = po.supplier || {};
  const recipientEmail = supplier.email;
  const poNum = po.po_number || `#${po.po_id}`;
  const subject = `Purchase Order Created — ${poNum}`;
  const type = 'PO_CREATED';

  if (!recipientEmail) {
    console.warn(`[EmailService] No email for supplier on PO ${po.po_id}. Skipping.`);
    await logEmail('None', subject, type, 'purchase_order', po.po_id, 'failed', 'Supplier has no email configured');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials missing');
    }

    const pdfBuffer = await pdfService.generatePurchaseOrderPDF(po);

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">New Purchase Order Invitation</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;">Please find attached our new Purchase Order <strong>${poNum}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;width:45%;">PO Number</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${poNum}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${po.po_date}</td>
            </tr>
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Expected Delivery</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;">${po.expected_delivery || 'Immediate'}</td>
            </tr>
            <tr style="background:linear-gradient(135deg,#e8f4fd,#dbeeff);">
              <td style="padding:14px 16px;font-size:14px;color:#1565c0;font-weight:700;">Grand Total</td>
              <td style="padding:14px 16px;font-size:16px;color:#1565c0;font-weight:700;">LKR ${Number(po.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">The detailed purchase order document is attached to this email.</p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody,
      attachments: [{
        filename: `PurchaseOrder_${poNum}.pdf`,
        content: pdfBuffer
      }]
    });

    await logEmail(recipientEmail, subject, type, 'purchase_order', po.po_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send PO email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'purchase_order', po.po_id, 'failed', err.message);
  }
};

/**
 * sendPaymentReceiptEmail
 */
const sendPaymentReceiptEmail = async (payment) => {
  const supplier = payment.supplier || {};
  const recipientEmail = supplier.email;
  const payRef = `PAY-${payment.payment_id}`;
  const subject = `Payment Confirmed — Ref ${payRef}`;
  const type = 'PAYMENT_RECEIPT';

  if (!recipientEmail) {
    console.warn(`[EmailService] No email for supplier on payment ${payment.payment_id}. Skipping.`);
    await logEmail('None', subject, type, 'payment', payment.payment_id, 'failed', 'Supplier has no email configured');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials missing');
    }

    const pdfBuffer = await pdfService.generatePaymentReceiptPDF(payment);

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Payment Receipt Confirmation</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;">We have processed a payment toward Invoice <strong>${payment.invoice_number}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;width:45%;">Payment Reference</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${payRef}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Invoice Number</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${payment.invoice_number}</td>
            </tr>
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Paid Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;">${payment.paid_date}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Payment Method</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;">${payment.payment_method || 'Cheque'}</td>
            </tr>
            <tr style="background:linear-gradient(135deg,#e8f4fd,#dbeeff);">
              <td style="padding:14px 16px;font-size:14px;color:#1565c0;font-weight:700;">Amount Paid</td>
              <td style="padding:14px 16px;font-size:16px;color:#1565c0;font-weight:700;">LKR ${Number(payment.paid_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Remaining Balance</td>
              <td style="padding:12px 16px;font-size:13px;color:#c62828;font-weight:600;">LKR ${Number(payment.balance_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">The detailed payment receipt PDF is attached.</p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody,
      attachments: [{
        filename: `Receipt_${payRef}.pdf`,
        content: pdfBuffer
      }]
    });

    await logEmail(recipientEmail, subject, type, 'payment', payment.payment_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send payment receipt email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'payment', payment.payment_id, 'failed', err.message);
  }
};

/**
 * sendPaymentOverdueEmail
 */
const sendPaymentOverdueEmail = async (payment) => {
  const supplier = payment.supplier || {};
  const recipientEmail = supplier.email;
  const payRef = `PAY-${payment.payment_id}`;
  const subject = `Urgent: Payment Overdue Notification — Invoice ${payment.invoice_number}`;
  const type = 'PAYMENT_OVERDUE';

  if (!recipientEmail) {
    console.warn(`[EmailService] No email for supplier on payment ${payment.payment_id}. Skipping.`);
    await logEmail('None', subject, type, 'payment', payment.payment_id, 'failed', 'Supplier has no email configured');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials missing');
    }

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#c62828,#e53935);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Overdue Accounts Payable Notification</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;">This is an alert that our outstanding balance for Invoice <strong>${payment.invoice_number}</strong> is overdue.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;width:45%;">Invoice Number</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${payment.invoice_number}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Invoice Amount</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;">LKR ${Number(payment.invoice_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Paid to Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#2e7d32;">LKR ${Number(payment.paid_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Due Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#c62828;font-weight:600;">${payment.due_date}</td>
            </tr>
            <tr style="background:linear-gradient(135deg, #ffebee, #ffcdd2);">
              <td style="padding:14px 16px;font-size:14px;color:#c62828;font-weight:700;">Outstanding Balance</td>
              <td style="padding:14px 16px;font-size:16px;color:#c62828;font-weight:700;">LKR ${Number(payment.balance_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#555;">We are working to process this balance as soon as possible. Thank you for your patience.</p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody
    });

    await logEmail(recipientEmail, subject, type, 'payment', payment.payment_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send payment overdue email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'payment', payment.payment_id, 'failed', err.message);
  }
};

/**
 * sendPOStatusUpdateEmail
 */
const sendPOStatusUpdateEmail = async (po) => {
  const supplier = po.supplier || {};
  const recipientEmail = supplier.email;
  const poNum = po.po_number || `#${po.po_id}`;
  const subject = `Purchase Order Status Updated — ${poNum}`;
  const type = 'PO_STATUS_UPDATE';

  if (!recipientEmail) {
    console.warn(`[EmailService] No email for supplier on PO status update ${po.po_id}. Skipping.`);
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials missing');
    }

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Purchase Order Update</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;">The status of Purchase Order <strong>${poNum}</strong> has been updated to: <span style="font-weight:700;color:#8b3a3a;">${po.status}</span>.</p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;width:45%;">PO Number</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">${poNum}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Updated Status</td>
              <td style="padding:12px 16px;font-size:13px;color:#8b3a3a;font-weight:700;">${po.status}</td>
            </tr>
            <tr style="background:#fdf5f5;">
              <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;">Total Value</td>
              <td style="padding:12px 16px;font-size:13px;color:#333;font-weight:600;">LKR ${Number(po.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">If you have any questions, please contact our procurement department.</p>
        </div>
        <div style="background:#f7f7f7;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody
    });

    await logEmail(recipientEmail, subject, type, 'purchase_order', po.po_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send status update email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'purchase_order', po.po_id, 'failed', err.message);
  }
};

module.exports = {
  sendPOCreatedEmail,
  sendPaymentReceiptEmail,
  sendPaymentOverdueEmail,
  sendPOStatusUpdateEmail
};
