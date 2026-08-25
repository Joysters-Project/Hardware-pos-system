const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const db = require('../models');
const { email_logs } = db;
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

    const pdfBuffer = await pdfService.generatePurchaseOrderPDF(po);

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
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">If you have any questions, please contact our procurement department. The updated Purchase Order is attached to this email.</p>
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
    console.error(`[EmailService] Failed to send status update email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'purchase_order', po.po_id, 'failed', err.message);
  }
};

/**
 * sendSupplierStatementEmail
 */
const sendSupplierStatementEmail = async (supplier, pdfBuffer, dateRange = {}) => {
  const recipientEmail = supplier.email;
  const subject = `Supplier Account Statement — Mathumithan Hardware`;
  const type = 'SUPPLIER_STATEMENT';

  if (!recipientEmail) {
    console.warn(`[EmailService] No email for supplier ${supplier.supplier_id}. Skipping statement email.`);
    await logEmail('None', subject, type, 'supplier', supplier.supplier_id, 'failed', 'Supplier has no email configured');
    throw new Error('Supplier email not configured');
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials missing');
    }

    const periodStr = dateRange.startDate && dateRange.endDate
      ? `for period ${dateRange.startDate} to ${dateRange.endDate}`
      : 'to date';

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Supplier Account Statement</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 20px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;">Please find attached your supplier statement ${periodStr}.</p>
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">The detailed statement document is attached in PDF format.</p>
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
        filename: `Statement_${supplier.supplier_code || supplier.supplier_id}.pdf`,
        content: pdfBuffer
      }]
    });

    await logEmail(recipientEmail, subject, type, 'supplier', supplier.supplier_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send supplier statement email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'supplier', supplier.supplier_id, 'failed', err.message);
    throw err;
  }
};

/**
 * sendPOCancelledEmail — sent when a PO is cancelled
 */
const sendPOCancelledEmail = async (po) => {
  const supplier = po.supplier || {};
  const recipientEmail = supplier.email;
  const poNum = po.po_number || `#${po.po_id}`;
  const subject = `Purchase Order Cancelled — ${poNum}`;
  const type = 'PO_CANCELLED';

  if (!recipientEmail) {
    await logEmail('None', subject, type, 'purchase_order', po.po_id, 'failed', 'Supplier has no email configured');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) throw new Error('SMTP credentials missing');

    const itemsHtml = (po.po_items || []).map(item => `
      <tr style="background:#fff;">
        <td style="padding:10px 14px;font-size:13px;color:#333;">${item.product?.product_name || `Product #${item.product_id}`}</td>
        <td style="padding:10px 14px;font-size:13px;color:#333;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;">LKR ${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;">LKR ${Number(item.total_price).toFixed(2)}</td>
        ${item.comment ? `<td style="padding:10px 14px;font-size:12px;color:#888;">${item.comment}</td>` : '<td style="padding:10px 14px;font-size:12px;color:#ccc;">—</td>'}
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#c62828,#e53935);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">${COMPANY.name}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Purchase Order Cancellation Notice</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 8px;">We regret to inform you that Purchase Order <strong style="color:#c62828;">${poNum}</strong> has been <strong>cancelled</strong>.</p>
          ${po.notes ? `<div style="background:#fff8f8;border-left:4px solid #c62828;padding:12px 16px;border-radius:6px;margin:16px 0;"><strong style="font-size:13px;color:#c62828;">Reason:</strong><p style="margin:4px 0 0;font-size:13px;color:#555;">${po.notes}</p></div>` : ''}
          <table style="width:100%;border-collapse:collapse;margin-top:20px;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:linear-gradient(135deg,#8b3a3a,#a84545);">
                <th style="padding:11px 14px;font-size:12px;color:#fff;text-align:left;">Product</th>
                <th style="padding:11px 14px;font-size:12px;color:#fff;text-align:center;">Qty</th>
                <th style="padding:11px 14px;font-size:12px;color:#fff;text-align:right;">Unit Price</th>
                <th style="padding:11px 14px;font-size:12px;color:#fff;text-align:right;">Total</th>
                <th style="padding:11px 14px;font-size:12px;color:#fff;text-align:left;">Comment</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="background:#fdf5f5;">
                <td colspan="3" style="padding:12px 14px;font-size:13px;font-weight:700;color:#8b3a3a;">Grand Total</td>
                <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#8b3a3a;text-align:right;">LKR ${Number(po.total_amount).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#aaa;">If you have any questions, please contact our procurement team directly.</p>
        </div>
        <div style="background:#f7f7f7;padding:14px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody,
    });

    await logEmail(recipientEmail, subject, type, 'purchase_order', po.po_id, 'sent');
  } catch (err) {
    console.error(`[EmailService] Failed to send cancellation email: ${err.message}`);
    await logEmail(recipientEmail || 'Unknown', subject, type, 'purchase_order', po.po_id, 'failed', err.message);
  }
};

/**
 * sendItemCommentEmail — sends a specific line item comment/note to the supplier
 */
const sendItemCommentEmail = async ({ supplier, poNumber, productName, quantity, unitPrice, comment }) => {
  const recipientEmail = supplier.email;
  const subject = `Note Regarding Your Order Item — ${poNumber}`;
  const type = 'ITEM_COMMENT';

  if (!recipientEmail) {
    throw new Error('Supplier email not configured');
  }

  const transporter = createTransporter();
  if (!transporter) throw new Error('SMTP credentials missing');

  const htmlBody = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:linear-gradient(135deg,#8b3a3a,#a84545);padding:24px 28px;">
        <h1 style="margin:0;color:#fff;font-size:20px;">${COMPANY.name}</h1>
        <p style="margin:5px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Item Note — Purchase Order ${poNumber}</p>
      </div>
      <div style="padding:24px 28px;">
        <p style="font-size:14px;color:#333;margin:0 0 18px;">Dear <strong>${supplier.supplier_name}</strong>,</p>
        <p style="font-size:13px;color:#555;margin:0 0 20px;">
          We have a note regarding a specific item in Purchase Order <strong>${poNumber}</strong>.
        </p>

        <div style="background:#fdf6f6;border-radius:8px;padding:16px 18px;border:1px solid #f0e0e0;margin-bottom:20px;">
          <div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">Item Details</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#888;width:40%;">Product</td>
              <td style="padding:6px 0;font-size:13px;color:#2c2c2c;font-weight:600;">${productName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#888;">Quantity</td>
              <td style="padding:6px 0;font-size:13px;color:#2c2c2c;font-weight:600;">${quantity}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#888;">Unit Price</td>
              <td style="padding:6px 0;font-size:13px;color:#2c2c2c;font-weight:600;">LKR ${Number(unitPrice).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="background:#fff8f0;border-left:4px solid #e65100;border-radius:0 8px 8px 0;padding:14px 18px;">
          <div style="font-size:11px;color:#e65100;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Note / Instruction</div>
          <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${comment}</p>
        </div>

        <p style="margin:20px 0 0;font-size:12px;color:#aaa;">Please acknowledge this note and contact us if you have any questions.</p>
      </div>
      <div style="background:#f7f7f7;padding:12px 28px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;color:#aaa;">${COMPANY.name} &bull; ${COMPANY.address} &bull; ${COMPANY.phone}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${COMPANY.name}" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject,
    html: htmlBody,
  });

  await logEmail(recipientEmail, subject, type, 'po_item', null, 'sent');
};

/**
 * sendProjectItemRemovedNotification
 */
const sendProjectItemRemovedNotification = async (details) => {
  try {
    const adminUsers = await db.users.findAll({
      where: {
        role: { [Op.in]: ['Admin', 'admin'] },
      },
      include: [{ model: db.employees, attributes: ['email'] }],
      attributes: ['user_id', 'user_name', 'role', 'employee_id'],
    });

    const adminEmails = [...new Set(adminUsers
      .map((user) => user.employee?.email)
      .filter(Boolean))];

    if (adminEmails.length === 0) {
      adminEmails.push(process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL || 'admin@mathumithanhardware.lk');
    }

    const recipientEmail = adminEmails.join(', ');
    const subject = `⚠️ Alert: Removed Project Item - ${details.product_name} (${details.project_name})`;

    const formattedDateTime = details.taken_at
      ? new Date(details.taken_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

    const htmlBody = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ea580c33;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#c62828,#b71c1c);padding:24px 28px;color:#ffffff;">
          <h2 style="margin:0;font-size:20px;font-weight:700;">⚠️ Project Transaction Item Removed</h2>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">System Alert &bull; ${COMPANY.name}</p>
        </div>
        <div style="padding:28px;">
          <p style="font-size:14px;color:#333333;margin:0 0 20px;line-height:1.5;">
            A transaction line item was removed from a project by <strong>${details.removed_by}</strong>. Below are the complete transaction details:
          </p>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0f0f0;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;width:40%;border-bottom:1px solid #eee;">Project Name</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;font-weight:700;border-bottom:1px solid #eee;">${details.project_name}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #eee;">Product Name</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;font-weight:700;border-bottom:1px solid #eee;">${details.product_name}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #eee;">Quantity Removed</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;font-weight:700;border-bottom:1px solid #eee;">${Number(details.quantity).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #eee;">Receiver Details</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;border-bottom:1px solid #eee;">${details.receiver_name} ${details.receiver_phone ? `(${details.receiver_phone})` : ''}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #eee;">Date &amp; Time</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;border-bottom:1px solid #eee;">${formattedDateTime}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #eee;">Removed By</td>
              <td style="padding:12px 16px;font-size:13px;color:#111;font-weight:600;border-bottom:1px solid #eee;">${details.removed_by}</td>
            </tr>
            <tr style="background:#fdf2f2;">
              <td style="padding:14px 16px;font-size:13px;color:#c62828;font-weight:700;border-bottom:1px solid #fee2e2;">Reason for Deletion</td>
              <td style="padding:14px 16px;font-size:14px;color:#c62828;font-weight:700;border-bottom:1px solid #fee2e2;">${details.reason}</td>
            </tr>
          </table>
        </div>
        <div style="background:#fafafa;padding:16px 28px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#888;">${COMPANY.name} Automated System Notification</p>
        </div>
      </div>
    `;

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[EmailService] Transporter unavailable for removal email notification.');
      await logEmail(recipientEmail, subject, 'PROJECT_ITEM_REMOVED', 'project_item', null, 'failed', 'SMTP credentials missing');
      return;
    }

    await transporter.sendMail({
      from: `"${COMPANY.name} Alerts" <${process.env.SMTP_EMAIL || process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html: htmlBody,
    });

    console.log(`[EmailService] ✉️  Sent project item removal notification to Admin (${recipientEmail})`);
    await logEmail(recipientEmail, subject, 'PROJECT_ITEM_REMOVED', 'project_item', null, 'sent');
  } catch (err) {
    console.error('[EmailService] Error sending item removal notification:', err.message);
  }
};

module.exports = {
  sendPOCreatedEmail,
  sendPaymentReceiptEmail,
  sendPaymentOverdueEmail,
  sendPOStatusUpdateEmail,
  sendSupplierStatementEmail,
  sendPOCancelledEmail,
  sendItemCommentEmail,
  sendProjectItemRemovedNotification,
};

