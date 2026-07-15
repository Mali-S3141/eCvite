import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const api = {
  login: (data) => apiClient.post('/auth/login', data),
  getRecords: (phone) => apiClient.get('/records', { params: { phone } }),
  saveRecords: (phone, records) => apiClient.post('/records/save', { phone, records }),
  deleteRecords: (ids) => apiClient.post('/records/delete', { ids }),
  importRecords: (phone, records) => apiClient.post('/records/import', { phone, records }),
  getExcelColumns: () => apiClient.get('/excel-columns'),
  addExcelColumnAlias: (technicalName, alias) =>
    apiClient.post(`/excel-columns/${encodeURIComponent(technicalName)}/aliases`, { alias }),
};

export default api;
