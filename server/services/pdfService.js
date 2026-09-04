const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'logo.png');

const COMPANY = {
  name:    'Mathumithan',
  subtitle: 'Hardware and Lumber and Furniture Dealer',
  address: 'A9 Road, School Near, Kanagarayankulam South, Vavuniya',
  phone:   '077 2521943',
  regNo:   'TD693V',
  email:   'info@mathumithanhardware.lk'
};

const money = (value) => {
  const numeric = Number(value || 0);
  return `LKR ${numeric.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const safeText = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const drawPageHeader = (doc, title, generatedText) => {
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, 112).fill('#7d1f2a');
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 42, 15, { width: 80, height: 80 });
  }

  doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('Mathumithan', 135, 22, { width: 260 });
  doc.fillColor('#f2d79b').fontSize(9).font('Helvetica').text('Hardware and Lumber and Furniture Dealer', 135, 48);
  doc.fillColor('#fff').fontSize(8).font('Helvetica').text(COMPANY.address, 135, 68);
  doc.fillColor('#fff').fontSize(8).font('Helvetica').text(`Reg. No: ${COMPANY.regNo}   |   Tel: ${COMPANY.phone}`, 135, 84);

  doc.fillColor('#fff').fontSize(15).font('Helvetica-Bold').text(title, 50, 128, { align: 'left' });
  doc.fillColor('#f2d79b').fontSize(8).font('Helvetica').text(generatedText, 0, 132, { align: 'right', width: pageWidth - 50 });

  doc.moveTo(50, 152).lineTo(545, 152).strokeColor('#d7b37a').stroke();
  doc.y = 168;
};

const drawFooter = (doc) => {
  doc.fillColor('#7d1f2a').fontSize(8).font('Helvetica').text(`Page ${doc.page.number}`, 0, doc.page.height - 28, { align: 'center', width: doc.page.width });
};

const addSummaryCard = (doc, x, y, label, value, color = '#7d1f2a') => {
  doc.roundedRect(x, y, 160, 56, 8).fill('#fff6f5');
  doc.strokeColor('#e9d0cc').lineWidth(1).stroke();
  doc.fillColor(color).fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x + 12, y + 12, { width: 136 });
  doc.fillColor('#2f2f2f').fontSize(16).font('Helvetica-Bold').text(value, x + 12, y + 25, { width: 136 });
};

const addTableHeader = (doc, columns, startY) => {
  const xPositions = columns.map((col, idx) => ({ ...col, x: col.x }));
  doc.y = startY;
  doc.fillColor('#7d1f2a').fontSize(7.5).font('Helvetica-Bold');
  xPositions.forEach((col) => doc.text(col.title, col.x, doc.y, { width: col.width, align: col.align || 'left' }));
  doc.y += 14;
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d8d8d8').stroke();
  doc.y += 8;
  doc.fillColor('#2f2f2f').font('Helvetica');
};

const ensurePageSpace = (doc, neededRows, tableStartY) => {
  if (doc.y + neededRows * 20 > 760) {
    doc.addPage();
    drawPageHeader(doc, 'Supplier Report', `Generated: ${new Date().toLocaleString('en-LK')}`);
    return tableStartY + 12;
  }
  return tableStartY;
};

/**
 * Helper to build a PDF buffer
 */
const generatePDFBuffer = (buildFn) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));
      
      buildFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * generatePurchaseOrderPDF
 */
const generatePurchaseOrderPDF = (po) => {
  return generatePDFBuffer((doc) => {
    // Top maroon bar
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text(`${COMPANY.phone}  |  ${COMPANY.email}`, 50, 60);
    doc.fontSize(16).font('Helvetica-Bold')
       .text('PURCHASE ORDER', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    // PO Metadata
    doc.fontSize(10).font('Helvetica-Bold').text(`PO Number: ${po.po_number || '#' + po.po_id}`, 50, doc.y);
    doc.font('Helvetica').text(`Date: ${po.po_date}`, 50, doc.y + 15);
    doc.text(`Expected Delivery: ${po.expected_delivery || 'N/A'}`, 50, doc.y + 30);
    doc.text(`Status: ${po.status}`, 50, doc.y + 45);

    // Supplier Info
    const supplier = po.supplier || {};
    doc.font('Helvetica-Bold').text('Supplier Info:', 320, doc.y);
    doc.font('Helvetica').text(supplier.supplier_name || 'N/A', 320, doc.y + 15);
    doc.text(`Contact: ${supplier.contact_person || supplier.contact || 'N/A'}`, 320, doc.y + 30);
    doc.text(`Phone: ${supplier.phone || 'N/A'}`, 320, doc.y + 45);
    doc.text(`Email: ${supplier.email || 'N/A'}`, 320, doc.y + 60);

    doc.y += 85;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 15;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#8b3a3a');
    doc.text('Item Description', 50, doc.y, { width: 220 });
    doc.text('Unit Price', 270, doc.y, { width: 80, align: 'right' });
    doc.text('Qty', 360, doc.y, { width: 50, align: 'right' });
    doc.text('Total (LKR)', 420, doc.y, { width: 125, align: 'right' });

    doc.y += 15;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;
    doc.fillColor('#333333').font('Helvetica');

    // Items list
    const items = po.po_items || [];
    items.forEach((item) => {
      const prodName = item.product ? item.product.product_name : `Product #${item.product_id}`;
      const price = Number(item.unit_price);
      const qty = Number(item.quantity);
      const total = price * qty;

      doc.fontSize(9);
      doc.text(prodName, 50, doc.y, { width: 220 });
      doc.text(price.toLocaleString('en-LK', { minimumFractionDigits: 2 }), 270, doc.y, { width: 80, align: 'right' });
      doc.text(qty.toString(), 360, doc.y, { width: 50, align: 'right' });
      doc.text(total.toLocaleString('en-LK', { minimumFractionDigits: 2 }), 420, doc.y, { width: 125, align: 'right' });
      
      doc.y += 20;
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;

    // Total Amount
    const totalAmount = Number(po.total_amount || 0);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b3a3a');
    doc.text('Grand Total:', 300, doc.y, { width: 110, align: 'right' });
    doc.text(`LKR ${totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 420, doc.y, { width: 125, align: 'right' });

    // Notes
    if (po.notes) {
      doc.y += 30;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#555555').text('Notes:', 50, doc.y);
      doc.font('Helvetica').fillColor('#333333').text(po.notes, 50, doc.y + 15, { width: 495 });
    }

    // Signature section
    doc.y = 700;
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#999').stroke();
    doc.moveTo(395, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
    doc.y += 6;
    doc.fontSize(9).fillColor('#555')
       .text('Prepared By', 50, doc.y, { width: 150, align: 'center' })
       .text('Authorized Signature', 395, doc.y, { width: 150, align: 'center' });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('This purchase order is an official document of Mathumithan Hardware Store.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

/**
 * generatePaymentReceiptPDF
 */
const generatePaymentReceiptPDF = (payment) => {
  return generatePDFBuffer((doc) => {
    // Top bar
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text(`${COMPANY.phone}  |  ${COMPANY.email}`, 50, 60);
    doc.fontSize(16).font('Helvetica-Bold')
       .text('PAYMENT RECEIPT', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    // Payment Info
    doc.fontSize(10).font('Helvetica-Bold').text(`Payment Ref: PAY-${payment.payment_id}`, 50, doc.y);
    doc.font('Helvetica').text(`Payment Date: ${payment.paid_date || 'Pending'}`, 50, doc.y + 15);
    doc.text(`Payment Method: ${payment.payment_method || 'N/A'}`, 50, doc.y + 30);
    doc.text(`Payment Status: ${payment.payment_status}`, 50, doc.y + 45);

    // Supplier Info
    const supplier = payment.supplier || {};
    doc.font('Helvetica-Bold').text('Supplier Info:', 320, doc.y);
    doc.font('Helvetica').text(supplier.supplier_name || 'N/A', 320, doc.y + 15);
    doc.text(`Contact: ${supplier.contact_person || supplier.contact || 'N/A'}`, 320, doc.y + 30);
    doc.text(`Phone: ${supplier.phone || 'N/A'}`, 320, doc.y + 45);

    doc.y += 85;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 15;

    // Detailed Amounts
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#8b3a3a').text('Payment Breakdown', 50, doc.y);
    doc.y += 20;

    const rows = [
      ['Purchase Order No:', payment.purchase_order ? payment.purchase_order.po_number : `#${payment.po_id}`, false],
      ['Invoice Number:', payment.invoice_number || 'N/A', false],
      ['Invoice Amount:', `LKR ${Number(payment.invoice_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, false],
      ['Paid Amount:', `LKR ${Number(payment.paid_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, true],
      ['Outstanding Balance:', `LKR ${Number(payment.balance_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, false],
    ];

    rows.forEach(([label, val, highlight]) => {
      if (highlight) {
        doc.rect(50, doc.y - 4, 495, 22).fill('#fff5f5');
        doc.fillColor('#8b3a3a').fontSize(10).font('Helvetica-Bold').text(label, 55, doc.y, { width: 200 });
        doc.text(val, 255, doc.y, { width: 280, align: 'right' });
      } else {
        doc.fillColor('#555555').fontSize(9).font('Helvetica-Bold').text(label, 55, doc.y, { width: 200 });
        doc.fillColor('#333333').font('Helvetica').text(val, 255, doc.y, { width: 280, align: 'right' });
      }
      doc.y += 22;
    });

    if (payment.notes) {
      doc.y += 15;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#555555').text('Notes:', 50, doc.y);
      doc.font('Helvetica').fillColor('#333333').text(payment.notes, 50, doc.y + 15, { width: 495 });
    }

    // Signatures
    doc.y = 700;
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#999').stroke();
    doc.moveTo(395, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
    doc.y += 6;
    doc.fontSize(9).fillColor('#555')
       .text('Verified By', 50, doc.y, { width: 150, align: 'center' })
       .text('Received By (Signature)', 395, doc.y, { width: 150, align: 'center' });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('This is an official payment confirmation receipt from Mathumithan Hardware Store.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

/**
 * generateSupplierStatementPDF
 */
const generateSupplierStatementPDF = (supplier, payments, orders, dateRange) => {
  return generatePDFBuffer((doc) => {
    // Top bar
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text(`${COMPANY.phone}  |  ${COMPANY.email}`, 50, 60);
    doc.fontSize(16).font('Helvetica-Bold')
       .text('SUPPLIER STATEMENT', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    // Header Metadata
    doc.fontSize(10).font('Helvetica-Bold').text(`Supplier: ${supplier.supplier_name}`, 50, doc.y);
    doc.font('Helvetica').text(`Supplier Code: ${supplier.supplier_code || 'N/A'}`, 50, doc.y + 15);
    doc.text(`Statement Period: ${dateRange.startDate || 'Beginning'} to ${dateRange.endDate || 'Present'}`, 50, doc.y + 30);
    doc.text(`Generated Date: ${new Date().toLocaleDateString('en-LK')}`, 50, doc.y + 45);

    // Calc Summary Stats
    const totalPurchased = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
    const balanceDue = totalPurchased - totalPaid;

    // Summary Cards block
    doc.rect(300, doc.y - 5, 245, 75).fill('#fff5f5');
    doc.fillColor('#8b3a3a').font('Helvetica-Bold').fontSize(9);
    doc.text('STATEMENT SUMMARY', 310, doc.y + 2);
    
    doc.fillColor('#555555').font('Helvetica');
    doc.text(`Total Purchases: LKR ${totalPurchased.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 310, doc.y + 18);
    doc.text(`Total Payments:  LKR ${totalPaid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 310, doc.y + 33);
    
    doc.fillColor('#8b3a3a').font('Helvetica-Bold');
    doc.text(`Outstanding Due: LKR ${balanceDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 310, doc.y + 48);

    doc.fillColor('#333333');
    doc.y += 85;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 15;

    // Statement Table Header
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#8b3a3a');
    doc.text('Date', 50, doc.y, { width: 70 });
    doc.text('Ref / Type', 120, doc.y, { width: 120 });
    doc.text('Purchase (Dr)', 240, doc.y, { width: 95, align: 'right' });
    doc.text('Payment (Cr)', 345, doc.y, { width: 95, align: 'right' });
    doc.text('Balance (LKR)', 450, doc.y, { width: 95, align: 'right' });

    doc.y += 15;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;
    doc.fillColor('#333333').font('Helvetica');

    // Combine and sort ledger entries
    const ledger = [];
    orders.forEach(o => {
      ledger.push({
        date: new Date(o.po_date),
        dateStr: o.po_date,
        ref: o.po_number || `PO-${o.po_id}`,
        type: 'Purchase Order',
        debit: Number(o.total_amount),
        credit: 0
      });
    });

    payments.forEach(p => {
      ledger.push({
        date: new Date(p.paid_date || p.created_at),
        dateStr: p.paid_date || (p.created_at ? p.created_at.split('T')[0] : 'N/A'),
        ref: p.invoice_number || `PAY-${p.payment_id}`,
        type: p.paid_amount > 0 ? 'Payment' : 'Pending',
        debit: 0,
        credit: Number(p.paid_amount)
      });
    });

    ledger.sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    ledger.forEach(entry => {
      runningBalance += (entry.debit - entry.credit);
      
      doc.fontSize(8.5);
      doc.text(entry.dateStr, 50, doc.y, { width: 70 });
      doc.text(`${entry.type} (${entry.ref})`, 120, doc.y, { width: 120 });
      doc.text(entry.debit > 0 ? entry.debit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-', 240, doc.y, { width: 95, align: 'right' });
      doc.text(entry.credit > 0 ? entry.credit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-', 345, doc.y, { width: 95, align: 'right' });
      doc.text(runningBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 }), 450, doc.y, { width: 95, align: 'right' });

      doc.y += 18;

      // Handle pagination dynamically if ledger gets too long
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
        // Repeat Header
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#8b3a3a');
        doc.text('Date', 50, doc.y, { width: 70 });
        doc.text('Ref / Type', 120, doc.y, { width: 120 });
        doc.text('Purchase (Dr)', 240, doc.y, { width: 95, align: 'right' });
        doc.text('Payment (Cr)', 345, doc.y, { width: 95, align: 'right' });
        doc.text('Balance (LKR)', 450, doc.y, { width: 95, align: 'right' });
        doc.y += 15;
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
        doc.y += 10;
        doc.fillColor('#333333').font('Helvetica');
      }
    });

    doc.y += 10;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    
    // Signatures
    doc.y = doc.page.height - 110;
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#999').stroke();
    doc.moveTo(395, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
    doc.y += 6;
    doc.fontSize(9).fillColor('#555')
       .text('Prepared By', 50, doc.y, { width: 150, align: 'center' })
       .text('Supplier Signature', 395, doc.y, { width: 150, align: 'center' });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('This statement reflects transactions logged up to the generation date.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

/**
 * generateOutstandingBalanceReportPDF
 */
const generateOutstandingBalanceReportPDF = (suppliers) => {
  return generatePDFBuffer((doc) => {
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text('OUTSTANDING AP BALANCE AGING REPORT', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    doc.fontSize(10).font('Helvetica-Bold').text(`Generated Date: ${new Date().toLocaleDateString('en-LK')}`, 50, doc.y);
    doc.y += 25;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#8b3a3a');
    doc.text('Supplier Code', 50, doc.y, { width: 80 });
    doc.text('Supplier Name', 140, doc.y, { width: 200 });
    doc.text('Tier', 350, doc.y, { width: 60 });
    doc.text('Outstanding Balance (LKR)', 420, doc.y, { width: 125, align: 'right' });

    doc.y += 15;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;
    doc.fillColor('#333333').font('Helvetica');

    let grandTotalOutstanding = 0;

    suppliers.forEach(supp => {
      const balance = Number(supp.outstanding_balance || 0);
      grandTotalOutstanding += balance;

      doc.fontSize(9);
      doc.text(supp.supplier_code || 'N/A', 50, doc.y, { width: 80 });
      doc.text(supp.supplier_name, 140, doc.y, { width: 200 });
      doc.text(supp.performance_tier || 'Bronze', 350, doc.y, { width: 60 });
      doc.text(balance.toLocaleString('en-LK', { minimumFractionDigits: 2 }), 420, doc.y, { width: 125, align: 'right' });
      doc.y += 20;

      if (doc.y > 720) {
        doc.addPage();
        doc.y = 50;
      }
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#8b3a3a');
    doc.text('Total Accounts Payable:', 250, doc.y, { width: 160, align: 'right' });
    doc.text(`LKR ${grandTotalOutstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 420, doc.y, { width: 125, align: 'right' });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('Accounts Payable Aging & Outstanding Balances Summary Report.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

/**
 * generateForecastReportPDF
 */
const generateForecastReportPDF = (forecasts) => {
  return generatePDFBuffer((doc) => {
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text('INVENTORY STOCK-OUT & FORECAST REPORT', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    doc.fontSize(10).font('Helvetica-Bold').text(`Generated Date: ${new Date().toLocaleDateString('en-LK')}`, 50, doc.y);
    doc.y += 25;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#8b3a3a');
    doc.text('Product Name', 50, doc.y, { width: 180 });
    doc.text('Stock', 240, doc.y, { width: 50, align: 'right' });
    doc.text('Daily Sales', 300, doc.y, { width: 60, align: 'right' });
    doc.text('Days Left', 370, doc.y, { width: 60, align: 'right' });
    doc.text('Risk Status', 440, doc.y, { width: 105, align: 'right' });

    doc.y += 15;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;
    doc.fillColor('#333333').font('Helvetica');

    forecasts.forEach(f => {
      doc.fontSize(9);
      doc.text(f.product_name, 50, doc.y, { width: 180 });
      doc.text(f.stock_quantity.toString(), 240, doc.y, { width: 50, align: 'right' });
      doc.text(Number(f.avg_daily_sales).toFixed(2), 300, doc.y, { width: 60, align: 'right' });
      doc.text(f.days_remaining === Infinity ? 'N/A' : Math.ceil(f.days_remaining).toString(), 370, doc.y, { width: 60, align: 'right' });
      
      let statusColor = '#388e3c'; // Safe green
      if (f.severity === 'Critical') statusColor = '#d32f2f'; // Critical red
      else if (f.severity === 'Low') statusColor = '#f57c00'; // Low/Warning orange

      doc.fillColor(statusColor).font('Helvetica-Bold').text(f.severity || 'Safe', 440, doc.y, { width: 105, align: 'right' });
      doc.fillColor('#333333').font('Helvetica');

      doc.y += 20;

      if (doc.y > 720) {
        doc.addPage();
        doc.y = 50;
      }
    });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('This is an inventory planning forecast report generated automatically.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

/**
 * generateSupplierPerformanceReportPDF
 */
const generateSupplierPerformanceReportPDF = (performances) => {
  return generatePDFBuffer((doc) => {
    doc.rect(0, 0, doc.page.width, 90).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(COMPANY.name, 50, 20);
    doc.fontSize(9).font('Helvetica')
       .text(COMPANY.address, 50, 48)
       .text('SUPPLIER PERFORMANCE & EVALUATION REPORT', 0, 30, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#333333');
    doc.y = 110;

    doc.fontSize(10).font('Helvetica-Bold').text(`Generated Date: ${new Date().toLocaleDateString('en-LK')}`, 50, doc.y);
    doc.y += 25;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#8b3a3a');
    doc.text('Supplier Code', 50, doc.y, { width: 70 });
    doc.text('Supplier Name', 125, doc.y, { width: 140 });
    doc.text('Score', 270, doc.y, { width: 40, align: 'right' });
    doc.text('On-Time %', 320, doc.y, { width: 55, align: 'right' });
    doc.text('Avg Delay', 385, doc.y, { width: 50, align: 'right' });
    doc.text('Orders', 445, doc.y, { width: 40, align: 'right' });
    doc.text('Tier', 495, doc.y, { width: 50, align: 'right' });

    doc.y += 15;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.y += 10;
    doc.fillColor('#333333').font('Helvetica');

    performances.forEach(p => {
      doc.fontSize(8.5);
      doc.text(p.supplier_code || 'N/A', 50, doc.y, { width: 70 });
      doc.text(p.supplier_name || 'N/A', 125, doc.y, { width: 140 });
      doc.text(Number(p.performance_score || 0).toFixed(1), 270, doc.y, { width: 40, align: 'right' });
      doc.text(`${Number(p.on_time_delivery_pct || p.on_time_pct || 0).toFixed(0)}%`, 320, doc.y, { width: 55, align: 'right' });
      doc.text(`${Number(p.avg_delay_days || 0).toFixed(1)}d`, 385, doc.y, { width: 50, align: 'right' });
      doc.text((p.total_orders || p.po_count || 0).toString(), 445, doc.y, { width: 40, align: 'right' });
      
      let tierColor = '#8b3a3a'; // Bronze/Default
      const tier = p.performance_tier || p.tier || 'Bronze';
      if (tier === 'Gold') tierColor = '#d97706';
      else if (tier === 'Silver') tierColor = '#4b5563';

      doc.fillColor(tierColor).font('Helvetica-Bold').text(tier, 495, doc.y, { width: 50, align: 'right' });
      doc.fillColor('#333333').font('Helvetica');

      doc.y += 20;

      if (doc.y > 720) {
        doc.addPage();
        doc.y = 50;
      }
    });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#8b3a3a');
    doc.fillColor('#ffffff').fontSize(8)
       .text('Mathumithan Hardware Store Supplier Performance Report.', 50, doc.page.height - 20, { align: 'center', width: doc.page.width - 100 });
  });
};

const generateSupplierReportPDF = (report) => {
  return generatePDFBuffer((doc) => {
    const summary = report?.summary || {};
    const suppliers = Array.isArray(report?.suppliers) ? report.suppliers : [];
    const orders = Array.isArray(report?.orders) ? report.orders : [];

    drawPageHeader(doc, 'Supplier Report', `Generated: ${safeText(summary.generatedAt ? new Date(summary.generatedAt).toLocaleString('en-LK') : new Date().toLocaleString('en-LK'))}`);

    addSummaryCard(doc, 50, 170, 'Total Suppliers', safeText(summary.totalSuppliers ?? suppliers.length ?? 0), '#7d1f2a');
    addSummaryCard(doc, 220, 170, 'Active Suppliers', safeText(summary.activeSuppliers ?? suppliers.filter((s) => String(s.status).toLowerCase() === 'active').length), '#0f7a3f');
    addSummaryCard(doc, 390, 170, 'Inactive Suppliers', safeText(summary.inactiveSuppliers ?? suppliers.filter((s) => String(s.status).toLowerCase() === 'inactive').length), '#8a5d2a');
    addSummaryCard(doc, 50, 238, 'Total Purchase Orders', safeText(summary.totalPurchaseOrders ?? orders.length), '#1d4b88');
    addSummaryCard(doc, 220, 238, 'Total Procurement Value', money(summary.totalProcurementValue ?? orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)), '#7d1f2a');
    addSummaryCard(doc, 390, 238, 'Report Date & Time', safeText(summary.generatedAt ? new Date(summary.generatedAt).toLocaleString('en-LK') : new Date().toLocaleString('en-LK')), '#4a4a4a');

    doc.y = 318;
    doc.fillColor('#7d1f2a').fontSize(12).font('Helvetica-Bold').text('Main Supplier List', 50, doc.y);
    doc.y += 22;

    const supplierColumns = [
      { title: 'ID', x: 50, width: 34 },
      { title: 'Supplier Name', x: 90, width: 86 },
      { title: 'Contact Person', x: 180, width: 68 },
      { title: 'Phone', x: 252, width: 58, align: 'left' },
      { title: 'Email', x: 314, width: 85 },
      { title: 'Orders', x: 404, width: 32, align: 'right' },
      { title: 'Purchase Value', x: 440, width: 56, align: 'right' },
      { title: 'Status', x: 500, width: 45, align: 'right' },
    ];

    let supplierStartY = doc.y;
    doc.moveTo(50, supplierStartY).lineTo(545, supplierStartY).strokeColor('#d8d8d8').stroke();
    addTableHeader(doc, supplierColumns, supplierStartY + 4);

    const printSupplierRows = suppliers.length ? suppliers : [{ supplier_id: '—', supplier_name: 'No suppliers available', contact_person: '—', phone: '—', email: '—', status: '—', total_orders: 0, total_purchase_value: 0 }];

    printSupplierRows.forEach((supplier, index) => {
      const status = safeText(supplier.status, '—');
      const rowY = doc.y;

      doc.fillColor('#2f2f2f').fontSize(7.5).font('Helvetica');
      doc.text(safeText(supplier.supplier_id, '—'), 50, rowY, { width: 34 });
      doc.text(safeText(supplier.supplier_name, '—'), 90, rowY, { width: 86 });
      doc.text(safeText(supplier.contact_person, '—'), 180, rowY, { width: 68 });
      doc.text(safeText(supplier.phone, '—'), 252, rowY, { width: 58 });
      doc.text(safeText(supplier.email, '—'), 314, rowY, { width: 85 });
      doc.text(safeText(supplier.total_orders ?? 0, '0'), 404, rowY, { width: 32, align: 'right' });
      doc.text(money(supplier.total_purchase_value ?? 0), 440, rowY, { width: 56, align: 'right' });
      doc.text(status, 500, rowY, { width: 45, align: 'right' });

      const extraLines = [];
      if (supplier.address) extraLines.push(`Address: ${supplier.address}`);
      if (supplier.last_purchase_date) extraLines.push(`Last Purchase: ${new Date(supplier.last_purchase_date).toLocaleDateString('en-LK')}`);

      if (extraLines.length) {
        doc.y += 14;
        doc.fillColor('#666').fontSize(6.8).font('Helvetica');
        doc.text(extraLines.join('  |  '), 90, doc.y, { width: 450 });
      }

      doc.y += 16;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#efefef').stroke();

      if (doc.y > 700) {
        doc.addPage();
        drawPageHeader(doc, 'Supplier Report', `Generated: ${new Date().toLocaleString('en-LK')}`);
        doc.y = 168;
        addTableHeader(doc, supplierColumns, doc.y);
      }
    });

    doc.y += 18;
    doc.fillColor('#7d1f2a').fontSize(12).font('Helvetica-Bold').text('Procurement Details', 50, doc.y);
    doc.y += 18;

    const orderColumns = [
      { title: 'PO No.', x: 50, width: 55 },
      { title: 'Supplier', x: 110, width: 80 },
      { title: 'Order Date', x: 195, width: 52 },
      { title: 'Products', x: 252, width: 76 },
      { title: 'Qty', x: 335, width: 28, align: 'right' },
      { title: 'Unit Price', x: 368, width: 52, align: 'right' },
      { title: 'Total', x: 425, width: 54, align: 'right' },
      { title: 'Status', x: 484, width: 60, align: 'right' },
    ];

    const detailRows = orders.length ? orders : [{ po_number: '—', supplier_name: 'No procurement records', po_date: '—', products: '—', quantity: '0', unit_price: '0', total_amount: '0', status: '—' }];

    addTableHeader(doc, orderColumns, doc.y + 2);

    detailRows.forEach((order) => {
      const rowY = doc.y;
      doc.fillColor('#2f2f2f').fontSize(7.1).font('Helvetica');
      doc.text(safeText(order.po_number, '—'), 50, rowY, { width: 55 });
      doc.text(safeText(order.supplier_name, '—'), 110, rowY, { width: 80 });
      doc.text(order.po_date ? new Date(order.po_date).toLocaleDateString('en-LK') : '—', 195, rowY, { width: 52 });
      doc.text(safeText(order.products, '—'), 252, rowY, { width: 76 });
      doc.text(safeText(order.quantity, '0'), 335, rowY, { width: 28, align: 'right' });
      doc.text(money(order.unit_price || 0), 368, rowY, { width: 52, align: 'right' });
      doc.text(money(order.total_amount || 0), 425, rowY, { width: 54, align: 'right' });
      doc.text(safeText(order.status, '—'), 484, rowY, { width: 60, align: 'right' });

      const appendedMeta = [];
      if (order.expected_delivery) appendedMeta.push(`Expected: ${new Date(order.expected_delivery).toLocaleDateString('en-LK')}`);
      if (order.actual_delivery_date) appendedMeta.push(`Received: ${new Date(order.actual_delivery_date).toLocaleDateString('en-LK')}`);
      if (order.payment_status) appendedMeta.push(`Payment: ${order.payment_status}`);
      if (appendedMeta.length) {
        doc.y += 14;
        doc.fillColor('#666').fontSize(6.5).font('Helvetica');
        doc.text(appendedMeta.join('  |  '), 110, doc.y, { width: 420 });
      }

      doc.y += 16;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#efefef').stroke();

      if (doc.y > 700) {
        doc.addPage();
        drawPageHeader(doc, 'Supplier Report', `Generated: ${new Date().toLocaleString('en-LK')}`);
        doc.y = 168;
        addTableHeader(doc, orderColumns, doc.y + 2);
      }
    });

    drawFooter(doc);
  });
};

module.exports = {
  generatePurchaseOrderPDF,
  generatePaymentReceiptPDF,
  generateSupplierStatementPDF,
  generateOutstandingBalanceReportPDF,
  generateForecastReportPDF,
  generateSupplierPerformanceReportPDF,
  generateSupplierReportPDF
};
