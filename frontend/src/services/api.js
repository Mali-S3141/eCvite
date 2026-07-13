import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

const api = {

    // הרשמה
    register: (data) =>
        apiClient.post('/auth/register', data),

    // התחברות
    login: (data) =>
        apiClient.post('/auth/login', data),


    // קבלת כל הנמענים
    getRecipients: () =>
        apiClient.get('/recipients'),


    // שמירת רשימת נמענים
    saveRecipients: (phone, rows) =>
        apiClient.post('/recipients/save', rows),


    // הוספת נמען יחיד
    addRecipient: (recipient) =>
        apiClient.post('/recipients', recipient),

};

export default api;