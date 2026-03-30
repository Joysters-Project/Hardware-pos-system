import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Purchase Order API
const purchaseOrderApi = {
  getAll: () => api.get('/RR_purchase_orders'),
  getById: (id) => api.get(`/RR_purchase_orders/${id}`),
  create: (data) => api.post('/RR_purchase_orders', data),
  update: (id, data) => api.put(`/RR_purchase_orders/${id}`, data),
  cancel: (id, notes) => api.put(`/RR_purchase_orders/${id}/cancel`, { notes }),
  exportPDF: (id) => api.get(`/RR_purchase_orders/${id}/export-pdf`, {
    responseType: 'blob'
  }),
  delete: (id) => api.delete(`/RR_purchase_orders/${id}`),
};

// Supplier API
const supplierApi = {
  getAll: () => api.get('/suppliers'),
  getActive: () => api.get('/suppliers'),
};

// Product API
const productApi = {
  getAll: () => api.get('/products'),
};

// ============ Custom Hooks for React Query ============

// Suppliers Hook - fetches only active suppliers
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await supplierApi.getActive();
      return response.data.filter(s => s.status === 'Active');
    },
  });
}

// Products Hook
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productApi.getAll();
      return response.data;
    },
  });
}

// Purchase Orders List Hook
export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      const response = await purchaseOrderApi.getAll();
      return response.data;
    },
  });
}

// Single Purchase Order Hook
export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: async () => {
      const response = await purchaseOrderApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create Purchase Order Mutation
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => purchaseOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase Order created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create Purchase Order');
    },
  });
}

// Update Purchase Order Mutation
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchaseOrderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] });
      toast.success('Purchase Order updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update Purchase Order');
    },
  });
}

// Cancel Purchase Order Mutation
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }) => purchaseOrderApi.cancel(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder'] });
      toast.success('Purchase Order cancelled successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to cancel Purchase Order');
    },
  });
}

// Export Purchase Order PDF
export function useExportPurchaseOrderPDF() {
  return useMutation({
    mutationFn: (id) => purchaseOrderApi.exportPDF(id),
    onSuccess: (data, id) => {
      // Create blob and download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF exported successfully!');
    },
    onError: () => {
      toast.error('Failed to export PDF');
    },
  });
}

// Delete Purchase Order Mutation
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase Order deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete Purchase Order');
    },
  });
}

export default api;
