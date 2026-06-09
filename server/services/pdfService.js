const PDFDocument = require('pdfkit');

const COMPANY = {
  name:    'Mathumithan Hardware',
  address: '123 Main Street, Colombo, Sri Lanka',
  phone:   '+94 11 234 5678',
  email:   'info@mathumithanhardware.lk'
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

module.exports = {
  generatePurchaseOrderPDF,
  generatePaymentReceiptPDF,
  generateSupplierStatementPDF,
  generateOutstandingBalanceReportPDF,
  generateForecastReportPDF
};
