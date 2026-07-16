import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const api = {
  login: (data) =>
      apiClient.post('/auth/login', data),
  register: (data) =>
      apiClient.post("/auth/register", data),
  getRecipients: (phone) =>
      apiClient.get('/recipients', { params: { phone } }),

    saveRecords: (phone, rows) =>
        apiClient.post('/recipients/save', {
            recipients: rows
        }),
  deleteRecipients: (ids) =>
      apiClient.post('/recipients/delete', { ids }),

  importRecipients: (phone, recipients) =>
      apiClient.post('/recipients/import', { phone, recipients }),

  getRecipientColumns: () =>
      apiClient.get('/recipient-columns'),

  addRecipientColumnAlias: (technicalName, alias) =>
      apiClient.post(
          `/recipient-columns/${encodeURIComponent(technicalName)}/aliases`,
          { alias }
      ),
};

export default api;