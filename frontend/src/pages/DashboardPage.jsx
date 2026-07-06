import { useEffect,useCallback, useState } from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import DataTable from '../components/DataTable';
import ExcelImport from '../components/ExcelImport';
import api from '../services/api';

function getLoggedUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function getLocalRecords(phone) {
  const saved = localStorage.getItem(`records-${phone}`);
  return saved ? JSON.parse(saved) : [];
}

function saveLocalRecords(phone, rows) {
  localStorage.setItem(`records-${phone}`, JSON.stringify(rows));
}

export default function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ setSelectedRows] = useState([]);
  const user = getLoggedUser();



  
  const loadRecords = useCallback(async () => {
    if (!user?.phone) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getRecords(user.phone);
      setRecords(response.data);
      setError('');
    } catch (err) {
      setError('לא ניתן לטעון רשומות מהמנוע האחורי. עובד במצב לא מקוון.');
      setRecords(getLocalRecords(user.phone));
    } finally {
      setLoading(false);
    }
  }, [user?.phone]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleSave = async (updatedRows) => {
    if (!user?.phone) return;

    try {
      await api.saveRecords(user.phone, updatedRows);
      await loadRecords();
    } catch (err) {
      setError('לא ניתן לשמור רשומות לשרת. השמירה תבצע באופן מקומי.');
      saveLocalRecords(user.phone, updatedRows);
      setRecords(updatedRows);
    }
  };

  const handleImport = async (rows) => {
    if (!user?.phone) return;

    try {
      await api.importRecords(user.phone, rows);
      await loadRecords();
    } catch (err) {
      setError('לא ניתן לייבא רשומות לשרת. הייבוא בוצע באופן מקומי.');
      saveLocalRecords(user.phone, rows);
      setRecords(rows);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">לוח רשומות</Typography>
        <Button variant="outlined" onClick={handleLogout}>
          יציאה
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" mb={2}>
          {error}
        </Typography>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <ExcelImport onImport={handleImport} />
      </Paper>

      <DataTable
        records={records}
        loading={loading}
        onSave={handleSave}
        onSelectionChange={setSelectedRows}
      />

      <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="contained">הדפס רשומות</Button>
        <Button variant="outlined">הדפס מדבקות</Button>
      </Box>
    </Container>
  );
}
