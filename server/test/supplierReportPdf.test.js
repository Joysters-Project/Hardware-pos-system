const assert = require('assert');
const { generateSupplierReportPDF } = require('../services/pdfService');

(async () => {
  try {
    const report = {
      summary: {
        totalSuppliers: 2,
        activeSuppliers: 1,
        inactiveSuppliers: 1,
        totalPurchaseOrders: 3,
        totalProcurementValue: 245000,
        generatedAt: new Date().toISOString(),
      },
      suppliers: [
        {
          supplier_id: 1,
          supplier_name: 'Jaya Hardware',
          contact_person: 'Nimal',
          phone: '0771234567',
          email: 'sales@jaya.lk',
          address: 'A9 Road, Vavuniya',
          status: 'Active',
          total_orders: 2,
          total_purchase_value: 180000,
          last_purchase_date: '2026-08-01',
        }
      ],
      orders: [
        {
          po_id: 10,
          po_number: 'PO-1001',
          supplier_name: 'Jaya Hardware',
          po_date: '2026-08-01',
          products: 'Steel Rod',
          quantity: '12',
          unit_price: '12000.00',
          total_amount: '144000.00',
          expected_delivery: '2026-08-12',
          actual_delivery_date: '2026-08-11',
          payment_status: 'Partial',
          status: 'Received'
        }
      ]
    };

    const pdf = await generateSupplierReportPDF(report);
    assert(Buffer.isBuffer(pdf), 'Expected a PDF buffer');
    assert(pdf.length > 1000, 'Expected a non-empty PDF payload');
    assert(pdf.toString('latin1').includes('/Type /Catalog'), 'Expected a valid PDF document');
    console.log('supplier report PDF generation test passed');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
