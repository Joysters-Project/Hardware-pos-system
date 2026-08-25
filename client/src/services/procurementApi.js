import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

// Use the shared axios instance that already has the JWT interceptor
import api from '../api/axios';
import { subscribeToEvent } from './socketSingleton';

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
      return data.filter((s) => String(s.status).toLowerCase() === 'active');
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
    mutationFn: (id) => poApi.exportPDF(id),
    onSuccess: (response, id) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('PDF opened!');
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
    mutationFn: (id) => paymentApi.downloadReceipt(id),
    onSuccess: (response, id) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_PAY-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Receipt PDF downloaded!');
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
    mutationFn: () => forecastApi.downloadReport(),
    onSuccess: (response) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Inventory_Forecast_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Forecast report downloaded!');
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
    mutationFn: ({ id, params }) => extraSupplierApi.downloadStatementPDF(id, params),
    onSuccess: (response, variables) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Statement_SUP-${variables.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Statement PDF downloaded!');
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
    mutationFn: () => api.get('/procurement/reports/outstanding/pdf', { responseType: 'blob' }),
    onSuccess: (response) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Outstanding_AP_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Outstanding Payables Report PDF downloaded!');
    },
    onError: () => toast.error('Failed to download Outstanding Payables Report PDF')
  });
}

export function useDownloadPerformanceReportPDF() {
  return useMutation({
    mutationFn: () => api.get('/procurement/reports/supplier-performance/pdf', { responseType: 'blob' }),
    onSuccess: (response) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Supplier_Performance_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Supplier Performance Report PDF downloaded!');
    },
    onError: () => toast.error('Failed to download Supplier Performance Report PDF')
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
      toast.success('Cheque status updated!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update cheque status'),
  });
}

