import api from '../api/axios';

export const chequeExchangeApi = {
  getDashboard: () => api.get('/cheque-exchange/dashboard'),
  getCustomers: (params = {}) => api.get('/cheque-exchange/customers', { params }),
  getCustomerById: (id) => api.get(`/cheque-exchange/customers/${id}`),
  createCustomer: (payload) => api.post('/cheque-exchange/customers', payload),
  updateCustomer: (id, payload) => api.put(`/cheque-exchange/customers/${id}`, payload),
  deleteCustomer: (id) => api.delete(`/cheque-exchange/customers/${id}`),
  getCheques: (params = {}) => api.get('/cheque-exchange', { params }),
  getChequeById: (id) => api.get(`/cheque-exchange/${id}`),
  createCheque: (payload) => api.post('/cheque-exchange', payload),
  updateCheque: (id, payload) => api.put(`/cheque-exchange/${id}`, payload),
  deleteCheque: (id) => api.delete(`/cheque-exchange/${id}`),
  updateChequeStatus: (id, payload) => api.patch(`/cheque-exchange/${id}/status`, payload),
  depositCheque: (id, payload = {}) => api.patch(`/cheque-exchange/${id}/deposit`, payload),
  recordRepayment: (id, payload = {}) => api.patch(`/cheque-exchange/${id}/repayment`, payload),
  getReports: (params = {}) => api.get('/cheque-exchange/reports', { params }),
  getBanks: () => api.get('/cheque-exchange/banks'),
};
