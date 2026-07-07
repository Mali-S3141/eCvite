import { useEffect, useState } from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import DataTable from '../components/DataTable';
import ExcelImport from '../components/ExcelImport';
import api from '../services/api';
import PrintModal from '../components/PrintModal'; // ייבוא המודאל החדש


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
  const [selectedRows, setSelectedRows] = useState([]);
  const user = getLoggedUser();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false); // סטייט לפתיחת המודאל

  const loadRecords = async () => {
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
  };

  useEffect(() => {
    loadRecords();
  }, []);
  // 🌟 ה-useEffect החדש שאת מוסיפה ממש כאן מתחתיו:
  useEffect(() => {
    const cameFromPreview = sessionStorage.getItem('fromPreview');
    
    if (cameFromPreview === 'true') {
      setIsPrintModalOpen(true); // פותח את המודאל רק אם חזרנו מהתצוגה המקדימה
      sessionStorage.removeItem('fromPreview'); // מוחק את הסימן מיד כדי שלא יציק שוב
    }
  }, []);

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
        <ExcelImport onImport={handleImport} onOpenPrint={() => setIsPrintModalOpen(true)} />
      </Paper>

      <DataTable
        records={records}
        loading={loading}
        onSave={handleSave}
        onSelectionChange={setSelectedRows}
      />

      {/* רנדור המודאל והעברת הרשומות המסומנות אליו */}
      <PrintModal 
        open={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        selectedRows={selectedRows} 
      />

      <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="contained">הדפס רשומות</Button>
      </Box>
    </Container>
  );
}
