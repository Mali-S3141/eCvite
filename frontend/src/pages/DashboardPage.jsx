import { useEffect,useCallback, useState } from 'react';
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
  if (!saved) return [];
  // מתעלמים משורות בלי id (למשל שיור ישן מגרסה קודמת) - הן היו מקריסות את DataGrid
  return JSON.parse(saved).filter((row) => row.id !== undefined && row.id !== null);
}

function saveLocalRecords(phone, rows) {
  localStorage.setItem(`records-${phone}`, JSON.stringify(rows));
}

export default function DashboardPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getLoggedUser();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]); // 🌟 רק הגדרה אחת, נקייה ותקינה!
  const [isTableDirty, setIsTableDirty] = useState(false);

  // זהות השורות שהיו מסומנות לפני שיצאנו לתצוגה המקדימה - נקרא פעם אחת, בטרם עולה הטבלה
  const [initialSelectedIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = sessionStorage.getItem('savedSelectedIds');
    return saved ? JSON.parse(saved) : [];
  });


  const loadRecords = useCallback(async () => {
    if (!user?.phone) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.getRecords(user.phone);

      //  שיפור: אם הבקאנד החזיר רשימה ריקה (כי ה-DB ריק/לא מחובר), נטען כגיבוי מהלוקאל
      if (response.data && response.data.length > 0) {
        setRecords(response.data);
      } else {
        const local = getLocalRecords(user.phone);
        setRecords(local);
      }

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

  // 🌟 פותח את המודאל אוטומטית אם המשתמש לחץ על "שינוי הגדרות" בתצוגה המקדימה
  useEffect(() => {
    const cameFromPreview = sessionStorage.getItem('fromPreview');

    if (cameFromPreview === 'true') {
      setIsPrintModalOpen(true);
      sessionStorage.removeItem('fromPreview'); // מנקים מיד כדי שלא יציק ברענונים הבאים
      sessionStorage.removeItem('savedSelectedIds');
    }
  }, []);
  //  מקפיץ אזהרה ברענן/סגירה רק אם הסטייט השתנה (כלומר יש שינויים שלא נשמרו)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isTableDirty) {
        e.preventDefault();
        // e.returnValue = 'ישנם שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTableDirty]);

  const handleAutoSaveLocal = (updatedRows) => {
    if (!user?.phone) return;
    saveLocalRecords(user.phone, updatedRows);
    setRecords(updatedRows);
    setIsTableDirty(true); //  בום! ברגע שיש שינוי בטבלה, האבא ננעל רשמית!
  };

  // מחיקה מפורשת ומיידית בשרת - רק ה-id-ים שבאמת נמחקו במסך, לא לפי השוואת רשימה מלאה
  const handleDeleteRows = async (idsToDelete) => {
    const realIds = idsToDelete.filter((id) => typeof id === 'number' || /^\d+$/.test(id));
    if (!realIds.length) return;
    try {
      await api.deleteRecords(realIds);
    } catch (err) {
      console.error('לא ניתן היה למחוק את הרשומות מהשרת:', err);
    }
  };
  const handleSave = async (updatedRows) => {
    console.log("1. כפתור שמור נלחץ בדאשבורד!");

    if (!user?.phone) {
      console.log("❌ השליחה נעצרת כי אין טלפון למשתמש:", user);
      return;
    }

    try {
      console.log("2. שולח לבקאנד:", updatedRows);

      const cleanRows = updatedRows.map(({ hashCode, ...rest }) => rest);

      console.log("2. שולח לבקאנד אחרי ניקוי:", cleanRows);

      await api.saveRecords(user.phone, cleanRows);

      console.log("3. נשמר בהצלחה!");

      setIsTableDirty(false);
      await loadRecords();

    } catch (err) {
      console.error("❌ שגיאה בשליחה לבקאנד:", err);
      setError('לא ניתן לשמור רשומות לשרת. השמירה תבצע באופן מקומי.');
      saveLocalRecords(user.phone, updatedRows);
    }
  }; // <-- זה היה חסר!

  const handleImport = ({ rows }) => {

    if (!user?.phone) return;

    const rowsWithId = rows.map((row, index) => ({
      id: index + 1,
      ...row
    }));

    console.log("ייבוא לפרונט בלבד:", rowsWithId);

    setRecords(rowsWithId);
    saveLocalRecords(user.phone, rowsWithId);
    setIsTableDirty(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="h5">לוח רשומות</Typography>
          <Button variant="outlined" size="small" onClick={handleLogout}>
            יציאה
          </Button>
        </Box>

        {error && (
            <Typography color="error" variant="body2" mb={1}>
              {error}
            </Typography>
        )}

        <Paper sx={{ p: 1, mb: 1.5 }}>
          <ExcelImport onImport={handleImport} onOpenPrint={() => setIsPrintModalOpen(true)} />
        </Paper>

        <DataTable
            records={records}
            loading={loading}
            onSave={handleSave}
            onAutoSave={handleAutoSaveLocal}
            onSelectionChange={setSelectedRows}
            onDeleteRows={handleDeleteRows}
            initialSelectedIds={initialSelectedIds}
        />

        {/* רנדור המודאל והעברת הרשומות המסומנות אליו */}
        <PrintModal
            open={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            selectedRows={selectedRows}
        />
      </Container>
  );}