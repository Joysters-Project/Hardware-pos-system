import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

// Use the shared axios instance that already has the JWT interceptor
import api from '../api/axios';
import { subscribeToEvent } from './socketSingleton';
import { printWithTemplate, buildTableHtml, escapeHtml } from '../utils/printTemplate';

// ── API functions ────────────────────────────────────────────────────────────

const supplierApi = {
  getAll:       ()           => api.get('/procurement/suppliers'),
  getById:      (id)         => api.get(`/procurement/suppliers/${id}`),
  create:       (data)       => api.post('/procurement/suppliers', data),
  update:       (id, data)   => api.put(`/procurement/suppliers/${id}`, data),
  updateStatus: (id, status) => api.patch(`/procurement/suppliers/${id}/status`, { status }),
  updateRating: (id, rating) => api.put(`/procurement/suppliers/${id}/rating`, { rating }),
  delete:       (id)         => api.delete(`/procurement/suppliers/${id}`),
};

const poApi = {
  getAll:       ()           => api.get('/procurement/purchase-orders'),
  getById:      (id)         => api.get(`/procurement/purchase-orders/${id}`),
  create:       (data)       => api.post('/procurement/purchase-orders', data),
  updateStatus: (id, data)   => api.put(`/procurement/purchase-orders/${id}/status`, data),
  cancel:       (id, notes)  => api.put(`/procurement/purchase-orders/${id}/cancel`, { notes, cancel_reason: notes }),
  exportPDF:    (id)         => api.get(`/procurement/purchase-orders/${id}/export-pdf`, { responseType: 'blob' }),
  delete:       (id)         => api.delete(`/procurement/purchase-orders/${id}`),
  sendEmail:    (id)         => api.post(`/procurement/purchase-orders/${id}/send-email`),
  updateItemComment:       (poId, itemId, comment) => api.patch(`/procurement/purchase-orders/${poId}/items/${itemId}/comment`, { comment }),
  sendItemCommentEmail:    (poId, itemId)          => api.post(`/procurement/purchase-orders/${poId}/items/${itemId}/send-comment-email`),
};

const dashboardApi = {
  getStats: () => api.get('/procurement/dashboard'),
};

const reportsApi = {
  supplierPerformance: () => api.get('/procurement/reports/supplier-performance'),
  supplierReportPDF: () => api.get('/procurement/reports/supplier-report/pdf', { responseType: 'blob' }),
  purchases:     (from, to) => api.get('/procurement/reports/purchases', { params: { from, to } }),
  outstanding:   ()         => api.get('/procurement/reports/outstanding'),
};

const productApi = {
  getAll: () => api.get('/products'),
};

// ── Supplier Hooks ───────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn:  async () => (await supplierApi.getAll()).data,
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: ['procurement-suppliers-active'],
    queryFn:  async () => {
      const data = (await supplierApi.getAll()).data;
      return data.filter((s) => s.status === 'Active');
    },
  });
}

export function useSupplier(id) {
  return useQuery({
    queryKey: ['procurement-supplier', id],
    queryFn:  async () => (await supplierApi.getById(id)).data,
    enabled:  !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => supplierApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Supplier created successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create supplier'),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => supplierApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Supplier updated successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update supplier'),
  });
}

export function useUpdateSupplierStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => supplierApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Supplier status updated!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update status'),
  });
}

export function useUpdateSupplierRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }) => supplierApi.updateRating(id, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Rating updated!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update rating'),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => supplierApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Supplier removed successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete supplier'),
  });
}

// ── Purchase Order Hooks ─────────────────────────────────────────────────────

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchaseOrders'],
    queryFn:  async () => (await poApi.getAll()).data,
  });
}

export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn:  async () => (await poApi.getById(id)).data,
    enabled:  !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => poApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase Order created successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create Purchase Order'),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => poApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
      toast.success('Purchase Order updated successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update Purchase Order'),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }) => poApi.cancel(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['purchaseOrder'] });
      toast.success('Purchase Order cancelled successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to cancel Purchase Order'),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => poApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase Order deleted successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete Purchase Order'),
  });
}

export function useSendPOEmail() {
  return useMutation({
    mutationFn: (id) => poApi.sendEmail(id),
    onSuccess: (res) => toast.success(res.data?.message || 'Email sent to supplier!'),
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to send email'),
  });
}

export function useUpdateItemComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, itemId, comment }) => poApi.updateItemComment(poId, itemId, comment),
    onSuccess: (_, { poId }) => {
      qc.invalidateQueries({ queryKey: ['purchaseOrder', String(poId)] });
      toast.success('Comment saved!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to save comment'),
  });
}

export function useSendItemCommentEmail() {
  return useMutation({
    mutationFn: ({ poId, itemId }) => poApi.sendItemCommentEmail(poId, itemId),
    onSuccess: (res) => toast.success(res.data?.message || 'Item note emailed to supplier!'),
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to send item note email'),
  });
}

export function useExportPurchaseOrderPDF() {
  return useMutation({
    mutationFn: (id) => poApi.getById(id),
    onSuccess: (response) => {
      const po = response.data;
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
      const rows = (po.po_items || []).map((item, i) => [
        i + 1,
        escapeHtml(item.product?.product_name || `Product #${item.product_id}`),
        item.quantity,
        `LKR ${Number(item.unit_price).toFixed(2)}`,
        `LKR ${Number(item.total_price).toFixed(2)}`,
        escapeHtml(item.comment || '—'),
      ]);
      const tableHtml = buildTableHtml({
        columns: ['#', 'Product', 'Qty', 'Unit Price', 'Total', 'Comment'],
        rows,
        emptyMessage: 'No items found.',
      });
      const supplierName = po.supplier?.supplier_name || '—';
      const subtitle = `PO: ${po.po_number} | Supplier: ${supplierName} | Date: ${fmtDate(po.po_date)} | Status: ${po.status} | Total: LKR ${Number(po.total_amount).toFixed(2)}`;
      printWithTemplate({ title: 'Purchase Order', subtitle, contentHtml: tableHtml });
    },
    onError: () => toast.error('Failed to export PDF'),
  });
}

// ── Dashboard Hook ───────────────────────────────────────────────────────────

export function useProcurementDashboard() {
  return useQuery({
    queryKey: ['procurementDashboard'],
    queryFn:  async () => (await dashboardApi.getStats()).data,
  });
}

// ── Reports Hooks ────────────────────────────────────────────────────────────

export function useSupplierPerformanceReport() {
  return useQuery({
    queryKey: ['report-supplier-performance'],
    queryFn:  async () => (await reportsApi.supplierPerformance()).data,
  });
}

export function usePurchaseSummaryReport(from, to) {
  return useQuery({
    queryKey: ['report-purchases', from, to],
    queryFn:  async () => (await reportsApi.purchases(from, to)).data,
  });
}

export function useOutstandingOrdersReport() {
  return useQuery({
    queryKey: ['report-outstanding'],
    queryFn:  async () => (await reportsApi.outstanding()).data,
  });
}

// ── Products Hook ────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn:  async () => (await productApi.getAll()).data,
  });
}

// ── Receive Order Item Hook ───────────────────────────────────────────────────

export function useReceiveOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/batch-inventory/receive', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['purchaseOrder', String(variables.po_id)] });
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Order received and batch created successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to receive order'),
  });
}

// ── New API definitions ──────────────────────────────────────────────────────

const paymentApi = {
  getAll:             (params) => api.get('/procurement/payments', { params }),
  getById:            (id)     => api.get(`/procurement/payments/${id}`),
  record:             (data)   => api.post('/procurement/payments', data),
  getDashboard:       ()       => api.get('/procurement/payments/dashboard'),
  getSupplierPayments:(id)     => api.get(`/procurement/payments/supplier/${id}`),
  downloadReceipt:    (id)     => api.get(`/procurement/payments/${id}/pdf`, { responseType: 'blob' }),
  updateChequeStatus: (id, cheque_status) => api.patch(`/procurement/payments/${id}/cheque-status`, { cheque_status }),
};

const reorderApi = {
  getSuggestions: () => api.get('/procurement/reorder/suggestions'),
  approveSuggestion: (id) => api.put(`/procurement/reorder/suggestions/${id}/approve`),
  rejectSuggestion: (id) => api.put(`/procurement/reorder/suggestions/${id}/reject`),
  convertToPO: (id) => api.post(`/procurement/reorder/suggestions/${id}/convert`),
  triggerCheck: () => api.post('/procurement/reorder/trigger')
};

const forecastApi = {
  getForecasts: () => api.get('/procurement/forecast'),
  downloadReport: () => api.get('/procurement/forecast/report/pdf', { responseType: 'blob' })
};

const notificationApi = {
  getAll: (status) => api.get('/procurement/notifications', { params: { status } }),
  getUnreadCount: () => api.get('/procurement/notifications/unread-count'),
  markRead: (ids) => api.put('/procurement/notifications/mark-read', { ids }),
  archive: (ids) => api.put('/procurement/notifications/archive', { ids })
};

const extraSupplierApi = {
  getStatement: (id, params) => api.get(`/procurement/suppliers/${id}/statement`, { params }),
  downloadStatementPDF: (id, params) => api.get(`/procurement/suppliers/${id}/statement/pdf`, { params, responseType: 'blob' })
};

// ── New React Query Hooks ────────────────────────────────────────────────────

// Payments Hooks
export function usePayments(params) {
  return useQuery({
    queryKey: ['procurement-payments', params],
    queryFn: async () => (await paymentApi.getAll(params)).data
  });
}

export function usePaymentDetails(id) {
  return useQuery({
    queryKey: ['procurement-payment', id],
    queryFn: async () => (await paymentApi.getById(id)).data,
    enabled: !!id
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => paymentApi.record(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-payments'] });
      qc.invalidateQueries({ queryKey: ['procurement-payment'] });
      qc.invalidateQueries({ queryKey: ['procurement-payment-dashboard'] });
      qc.invalidateQueries({ queryKey: ['procurementDashboard'] });
      qc.invalidateQueries({ queryKey: ['cheque-alerts'] });
      toast.success('Payment recorded successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to record payment')
  });
}

export function usePaymentDashboard() {
  return useQuery({
    queryKey: ['procurement-payment-dashboard'],
    queryFn: async () => (await paymentApi.getDashboard()).data
  });
}

export function useSupplierPayments(supplierId) {
  return useQuery({
    queryKey: ['procurement-supplier-payments', supplierId],
    queryFn: async () => (await paymentApi.getSupplierPayments(supplierId)).data,
    enabled: !!supplierId
  });
}

export function useDownloadPaymentReceipt() {
  return useMutation({
    mutationFn: (id) => paymentApi.getById(id),
    onSuccess: (response) => {
      const p = response.data;
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
      const rows = [[
        escapeHtml(p.payment_reference || `PAY-${p.payment_id}`),
        escapeHtml(p.supplier?.supplier_name || '—'),
        escapeHtml(p.payment_method || '—'),
        `LKR ${Number(p.amount || 0).toFixed(2)}`,
        fmtDate(p.payment_date),
        escapeHtml(p.status || '—'),
        escapeHtml(p.notes || '—'),
      ]];
      const tableHtml = buildTableHtml({
        columns: ['Reference', 'Supplier', 'Method', 'Amount', 'Date', 'Status', 'Notes'],
        rows,
      });
      printWithTemplate({
        title: 'Payment Receipt',
        subtitle: `Reference: ${p.payment_reference || `PAY-${p.payment_id}`} | Supplier: ${p.supplier?.supplier_name || '—'}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download receipt PDF')
  });
}

// Reorders Hooks
export function useReorderSuggestions() {
  return useQuery({
    queryKey: ['procurement-reorders'],
    queryFn: async () => (await reorderApi.getSuggestions()).data
  });
}

export function useApproveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => reorderApi.approveSuggestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-reorders'] });
      toast.success('Suggestion approved!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to approve suggestion')
  });
}

export function useRejectSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => reorderApi.rejectSuggestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-reorders'] });
      toast.success('Suggestion rejected!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to reject suggestion')
  });
}

export function useConvertSuggestionToPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => reorderApi.convertToPO(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['procurement-reorders'] });
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['procurementDashboard'] });
      toast.success(`Converted to Purchase Order ${res.data?.po_number || ''}!`);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to convert suggestion')
  });
}

export function useTriggerReorderCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reorderApi.triggerCheck(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['procurement-reorders'] });
      qc.invalidateQueries({ queryKey: ['procurementDashboard'] });
      toast.success(`Check complete. Generated ${res.data?.suggestions_created || 0} suggestions.`);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to run reorder check')
  });
}

// Forecast Hooks
export function useForecasts() {
  return useQuery({
    queryKey: ['procurement-forecasts'],
    queryFn: async () => (await forecastApi.getForecasts()).data
  });
}

export function useDownloadForecastReport() {
  return useMutation({
    mutationFn: () => forecastApi.getForecasts(),
    onSuccess: (response) => {
      const forecasts = Array.isArray(response.data) ? response.data : [];
      const rows = forecasts.map((f) => [
        escapeHtml(f.product_name || f.product?.product_name || '—'),
        escapeHtml(f.category || '—'),
        f.current_stock ?? '—',
        f.reorder_point ?? '—',
        f.suggested_order_qty ?? '—',
        escapeHtml(f.forecast_status || f.status || '—'),
      ]);
      const tableHtml = buildTableHtml({
        columns: ['Product', 'Category', 'Current Stock', 'Reorder Point', 'Suggested Qty', 'Status'],
        rows,
        emptyMessage: 'No forecast data available.',
      });
      printWithTemplate({
        title: 'Inventory Forecast Report',
        subtitle: `Total items: ${forecasts.length}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download forecast report')
  });
}

// Notifications Hooks
export function useNotifications(status) {
  return useQuery({
    queryKey: ['procurement-notifications', status],
    queryFn: async () => (await notificationApi.getAll(status)).data
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['procurement-notifications-unread-count'],
    queryFn: async () => (await notificationApi.getUnreadCount()).data,
    refetchInterval: 15000 // Poll count every 15s for dynamic alerts
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => notificationApi.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-notifications'] });
      qc.invalidateQueries({ queryKey: ['procurement-notifications-unread-count'] });
    }
  });
}

export function useArchiveNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => notificationApi.archive(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-notifications'] });
      qc.invalidateQueries({ queryKey: ['procurement-notifications-unread-count'] });
      toast.success('Notifications archived');
    }
  });
}

// Statement Hooks
export function useSupplierStatement(id, params) {
  return useQuery({
    queryKey: ['procurement-supplier-statement', id, params],
    queryFn: async () => (await extraSupplierApi.getStatement(id, params)).data,
    enabled: !!id
  });
}

export function useDownloadStatementPDF() {
  return useMutation({
    mutationFn: ({ id, params }) => extraSupplierApi.getStatement(id, params),
    onSuccess: (response, variables) => {
      const data = response.data;
      const supplier = data.supplier || {};
      const transactions = Array.isArray(data.transactions) ? data.transactions : [];
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
      const rows = transactions.map((t) => [
        fmtDate(t.date || t.payment_date || t.po_date),
        escapeHtml(t.reference || t.po_number || t.payment_reference || '—'),
        escapeHtml(t.type || t.transaction_type || '—'),
        `LKR ${Number(t.debit || 0).toFixed(2)}`,
        `LKR ${Number(t.credit || 0).toFixed(2)}`,
        `LKR ${Number(t.balance || 0).toFixed(2)}`,
      ]);
      const tableHtml = buildTableHtml({
        columns: ['Date', 'Reference', 'Type', 'Debit', 'Credit', 'Balance'],
        rows,
        emptyMessage: 'No transactions found.',
      });
      printWithTemplate({
        title: 'Supplier Statement',
        subtitle: `Supplier: ${escapeHtml(supplier.supplier_name || `SUP-${variables.id}`)}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download statement PDF')
  });
}

export function useEmailSupplierStatement() {
  return useMutation({
    mutationFn: ({ id, params }) => api.post(`/procurement/suppliers/${id}/statement/email`, params),
    onSuccess: () => {
      toast.success('Supplier statement email sent successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to email supplier statement')
  });
}

export function useSupplierDocuments(supplierId) {
  return useQuery({
    queryKey: ['procurement-supplier-documents', supplierId],
    queryFn: async () => (await api.get(`/procurement/suppliers/${supplierId}/documents`)).data,
    enabled: !!supplierId
  });
}

export function useUploadSupplierDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => api.post(`/procurement/suppliers/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ['procurement-supplier-documents', variables.id] });
      toast.success('Document uploaded successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to upload document')
  });
}

export function useDeleteSupplierDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId }) => api.delete(`/procurement/suppliers/${id}/documents/${docId}`),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ['procurement-supplier-documents', variables.id] });
      toast.success('Document deleted successfully!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete document')
  });
}

export function useDownloadOutstandingReportPDF() {
  return useMutation({
    mutationFn: () => reportsApi.outstanding(),
    onSuccess: (response) => {
      const orders = Array.isArray(response.data) ? response.data : [];
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
      const rows = orders.map((po) => {
        const days = po.expected_delivery
          ? Math.max(0, Math.floor((new Date() - new Date(po.expected_delivery)) / 86400000))
          : 0;
        return [
          escapeHtml(po.po_number || `#${po.po_id}`),
          escapeHtml(po.supplier?.supplier_name || '—'),
          escapeHtml(po.status || '—'),
          fmtDate(po.expected_delivery),
          `${days}d overdue`,
          `LKR ${Number(po.total_amount || 0).toFixed(2)}`,
        ];
      });
      const tableHtml = buildTableHtml({
        columns: ['PO Number', 'Supplier', 'Status', 'Expected Delivery', 'Days Overdue', 'Total Amount'],
        rows,
        emptyMessage: 'No outstanding orders found.',
      });
      printWithTemplate({
        title: 'Outstanding Payables Report',
        subtitle: `Total overdue orders: ${orders.length}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download Outstanding Payables Report PDF')
  });
}

export function useDownloadPerformanceReportPDF() {
  return useMutation({
    mutationFn: () => reportsApi.supplierPerformance(),
    onSuccess: (response) => {
      const rows = (Array.isArray(response.data) ? response.data : []).map((r) => [
        escapeHtml(r.supplier_name || '—'),
        escapeHtml(r.supplier_code || '—'),
        r.total_orders ?? '—',
        r.received_orders ?? '—',
        `${r.on_time_pct ?? 0}%`,
        r.avg_delay_days > 0 ? `+${r.avg_delay_days}d` : '—',
        r.performance_rating ? `${r.performance_rating}/5` : '—',
      ]);
      const tableHtml = buildTableHtml({
        columns: ['Supplier', 'Code', 'Total Orders', 'Received', 'On-Time %', 'Avg Delay', 'Rating'],
        rows,
        emptyMessage: 'No performance data available.',
      });
      printWithTemplate({
        title: 'Supplier Performance Report',
        subtitle: `Total suppliers evaluated: ${Array.isArray(response.data) ? response.data.length : 0}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download Supplier Performance Report PDF')
  });
}

export function useDownloadSupplierReportPDF() {
  return useMutation({
    mutationFn: () => supplierApi.getAll(),
    onSuccess: (response) => {
      const suppliers = Array.isArray(response.data) ? response.data : [];
      const rows = suppliers.map((s) => [
        escapeHtml(s.supplier_code || `SUP-${s.supplier_id}`),
        escapeHtml(s.supplier_name || '—'),
        escapeHtml(s.contact_person || '—'),
        escapeHtml(s.email || '—'),
        escapeHtml(s.phone || '—'),
        escapeHtml(s.status || '—'),
        s.performance_rating ? `${s.performance_rating}/5` : '—',
      ]);
      const tableHtml = buildTableHtml({
        columns: ['Code', 'Supplier Name', 'Contact', 'Email', 'Phone', 'Status', 'Rating'],
        rows,
        emptyMessage: 'No suppliers found.',
      });
      printWithTemplate({
        title: 'Supplier Report',
        subtitle: `Total suppliers: ${suppliers.length}`,
        contentHtml: tableHtml,
      });
    },
    onError: () => toast.error('Failed to download supplier report PDF')
  });
}

export function useChequeAlerts() {
  const qc = useQueryClient();

  // Socket-driven instant refresh when cheque status changes
  useEffect(() => {
    return subscribeToEvent('cheque:alerts:updated', () => {
      qc.invalidateQueries({ queryKey: ['cheque-alerts'] });
    });
  }, [qc]);

  return useQuery({
    queryKey: ['cheque-alerts'],
    queryFn: async () => (await api.get('/procurement/payments/cheque-alerts')).data,
    refetchInterval: 30000, // poll every 30 s as fallback
  });
}

export function useUpdateChequeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cheque_status }) => paymentApi.updateChequeStatus(id, cheque_status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-payments'] });
      qc.invalidateQueries({ queryKey: ['procurement-payment-dashboard'] });
      qc.invalidateQueries({ queryKey: ['cheque-alerts'] });
      toast.success('Cheque status updated!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update cheque status'),
  });
}

