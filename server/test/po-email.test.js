const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const pdfService = require('../services/pdfService');

const originalCreateTransport = nodemailer.createTransport;
const originalEmailUser = process.env.SMTP_EMAIL;
const originalEmailPass = process.env.SMTP_PASSWORD;
const originalGeneratePurchaseOrderPDF = pdfService.generatePurchaseOrderPDF;

test('sendPOApprovedEmail sends an approval notice with the approved PO subject', async () => {
  process.env.SMTP_EMAIL = 'test@example.com';
  process.env.SMTP_PASSWORD = 'secret';

  const sent = [];
  nodemailer.createTransport = () => ({
    sendMail: async (options) => {
      sent.push(options);
      return { accepted: [options.to] };
    },
  });

  pdfService.generatePurchaseOrderPDF = async () => Buffer.from('pdf');

  const emailService = require('../services/emailService');

  await emailService.sendPOApprovedEmail({
    po_id: 101,
    po_number: 'PO-2026-0001',
    po_date: '2026-06-10',
    expected_delivery: '2026-06-20',
    total_amount: 2500,
    status: 'Approved',
    supplier: { supplier_name: 'ABC Supplies', email: 'supplier@example.com' },
    po_items: [],
  });

  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Purchase Order Approved/i);
  assert.match(sent[0].subject, /PO-2026-0001/);

  nodemailer.createTransport = originalCreateTransport;
  pdfService.generatePurchaseOrderPDF = originalGeneratePurchaseOrderPDF;
  if (originalEmailUser === undefined) delete process.env.SMTP_EMAIL; else process.env.SMTP_EMAIL = originalEmailUser;
  if (originalEmailPass === undefined) delete process.env.SMTP_PASSWORD; else process.env.SMTP_PASSWORD = originalEmailPass;
});
