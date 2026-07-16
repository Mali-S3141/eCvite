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
    uploadExcel: (formData, phone) =>
        apiClient.post(
            `/recipients/upload-excel?phone=${phone}`,
            formData,
            {
                headers:{
                    "Content-Type":"multipart/form-data"
                }
            }
        ),
    saveRecords: (phone, rows) =>
        apiClient.post('/recipients/save', {
            phone: phone,
            recipients: rows
        }),
  deleteRecipients: (ids) =>
      apiClient.post('/recipients/delete', { ids }),

  importRecipients: (phone, recipients) =>
      apiClient.post('/recipients/import', { phone, recipients }),

  getRecipientColumns: () =>
      apiClient.get('/recipient-columns'),
    importRecords: (phone, rows) =>
        apiClient.post('/recipients/import', {
            phone,
            recipients: rows
        }),
  addRecipientColumnAlias: (technicalName, alias) =>
      apiClient.post(
          `/recipient-columns/${encodeURIComponent(technicalName)}/aliases`,
          { alias }
      ),
};

export default api;