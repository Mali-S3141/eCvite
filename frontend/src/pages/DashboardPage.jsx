import { useEffect,useCallback, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DataTable from '../components/DataTable';
import api from '../services/api';
import PrintModal from '../components/PrintModal'; // ייבוא המודאל החדש
import { buildIdentityKey, mergeBelongsToValues } from '../utils/recipientIdentity';



function getLoggedUser() {
  const raw = sessionStorage.getItem('user');
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
      const response = await api.getRecipients(user.phone);

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

  // עטוף ב-useCallback (לא פונקציה רגילה) כדי שהזהות שלו תישאר יציבה בין רינדורים -
  // אחרת DataTable מקבל onAutoSave חדש בכל הקשה, מה שגורם לו לבנות מחדש את כל
  // ה-columns שלו וקלטי העריכה מאבדים פוקוס אחרי כל אות (בדיוק הבאג שנתקלנו בו)
  const handleAutoSaveLocal = useCallback((updatedRows) => {
    if (!user?.phone) return;
    saveLocalRecords(user.phone, updatedRows);
    setRecords(updatedRows);
    setIsTableDirty(true); //  בום! ברגע שיש שינוי בטבלה, האבא ננעל רשמית!
  }, [user?.phone]);

  // מחיקה לא נשלחת לשרת מיד - רק נשמרת בתור "ממתינה" ונשלחת בפועל רק כשלוחצים "שמור
  // את כל המוזמנים" (handleSave), יחד עם שאר השינויים. המזהה האמיתי של שורה שמורה
  // הוא ה-hashCode (מחרוזת) - id מספרי טהור הוא שורה חדשה שעוד לא נשמרה בשרת בכלל
  // (ר' handleAddRow/handleImport), ולכן אין מה למחוק בשבילה
  const [pendingDeleteHashCodes, setPendingDeleteHashCodes] = useState([]);

  const handleDeleteRows = (idsToDelete) => {
    const realIds = idsToDelete.filter((id) => !(typeof id === 'number' || /^\d+$/.test(String(id))));
    if (!realIds.length) return;
    setPendingDeleteHashCodes((prev) => Array.from(new Set([...prev, ...realIds])));
  };
  const handleSave = async (updatedRows) => {
    console.log("1. כפתור שמור נלחץ בדאשבורד!");

    if (!user?.phone) {
      console.log("❌ השליחה נעצרת כי אין טלפון למשתמש:", user);
      return;
    }

    try {
      // מוחקים בשרת קודם, לפני השמירה - לא אחריה. אם המחיקה הייתה רצה אחרי השמירה,
      // נמען שנמחק ואז יובא/נוסף מחדש עם אותה זהות (שם+טלפון+כתובת) היה מקבל hash
      // זהה לנמען הישן שעדיין מקושר אליך באותו רגע (המחיקה עוד לא רצה) - והמחיקה
      // שרצה רק אחר כך הייתה מנתקת בטעות גם את מה שכרגע נשמר
      if (pendingDeleteHashCodes.length > 0) {
        try {
          await api.deleteRecipients(user.phone, pendingDeleteHashCodes);
          setPendingDeleteHashCodes([]);
        } catch (deleteErr) {
          console.error('❌ שגיאה במחיקה מהבקאנד:', deleteErr);
          setError('לא ניתן היה למחוק חלק מהשורות מהשרת.');
        }
      }

      console.log("2. שולח לבקאנד:", updatedRows);

      // hashCode כן נשלח (רק id המקומי-לתצוגה מוסר) - שורה עם hashCode היא נמען שכבר
      // קיים בשרת, ומזהה אותו במפורש בשביל עדכון; רק שורה חדשה לגמרי (בלי hashCode,
      // כמו מ"הוסף שורה") תיבדק ותקבל hash חדש בצד השרת
      const cleanRows = updatedRows.map(
          ({ id, ...rest }) => rest
      );

      console.log("2. שולח לבקאנד אחרי ניקוי:", cleanRows);


      console.log("SENDING TO BACKEND:", {
        phone: user.phone,
        recipients: cleanRows
      });

      const response = await api.saveRecords(
          user.phone,
          cleanRows
      );



      console.log("3. נשמר בהצלחה!", response.data);

     setIsTableDirty(false);

      await loadRecords();


    } catch (err) {

      console.error("❌ שגיאה בשליחה לבקאנד:", err);

      setError(
          'לא ניתן לשמור רשומות לשרת. השמירה תבצע באופן מקומי.'
      );

      saveLocalRecords(user.phone, updatedRows);
    }
  };

  // ייבוא אקסל לא שומר לשרת מיד - רק מציג את השורות בטבלה מקומית, בדיוק כמו כל עריכה
  // אחרת. השמירה בפועל ל-Neon קורית רק כשלוחצים "שמור את כל המוזמנים" (handleSave)
  const handleImport = (rows) => {
    // onImport נקרא לפעמים עם מערך שורות ולפעמים עם { rows, columns } - תלוי בנתיב
    // בתוך ExcelImport - שני המבנים קיימים היום בפועל
    const importedRows = Array.isArray(rows) ? rows : rows?.rows ?? [];
    if (!importedRows.length || !user?.phone) return;

    // ממזגים כל שורה שמיובאת מול מה שכבר יושב בטבלה (לא רק בין גליונות של אותו קובץ -
    // זה כבר טופל ב-ExcelImport - אלא גם מול נמענים שכבר קיימים מייבוא/שמירה קודמים).
    // כך שאם נמען כבר קיים ומיובא שוב עם "שייך ל" אחר, זה מתמזג מיד ויזואלית בטבלה,
    // לא רק אחרי לחיצה על "שמור" - אותו כלל בדיוק שרץ בשרת (belongsTo מצטבר, שאר
    // השדות "העדכני מנצח"), כדי שמה שרואים כאן יתאים בדיוק למה שבאמת יישמר
    const importedByIdentity = new Map();
    importedRows.forEach((row) => {
      const key = buildIdentityKey(row);
      if (key.replace(/\|/g, '') === '') return; // שורות בלי שום פרט זהות לא ממוזגות
      importedByIdentity.set(key, row);
    });

    const mergedRecords = records.map((row) => {
      const key = buildIdentityKey(row);
      const importedMatch = key.replace(/\|/g, '') !== '' ? importedByIdentity.get(key) : null;
      if (!importedMatch) return row;
      importedByIdentity.delete(key); // נוצל - לא ייווצר בשבילו גם שורה חדשה נפרדת
      return {
        ...row,
        ...importedMatch,
        id: row.id,
        hashCode: row.hashCode,
        belongsTo: mergeBelongsToValues(row.belongsTo, importedMatch.belongsTo),
      };
    });

    // אותה שיטת מזהה זמני כמו "הוסף שורה" בטבלה - שורות שבאמת חדשות (לא התמזגו לתוך
    // שורה קיימת למעלה) עוד לא נשמרו בשרת, אז אין להן hashCode
    const numericIds = records.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
    let nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
    const blankIdentityRows = importedRows.filter((row) => buildIdentityKey(row).replace(/\|/g, '') === '');
    const trulyNewRows = [...importedByIdentity.values(), ...blankIdentityRows];
    const rowsWithIds = trulyNewRows.map((row) => ({ ...row, id: row.id ?? nextId++ }));

    handleAutoSaveLocal([...rowsWithIds, ...mergedRecords]);
    setError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  };
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'בוקר טוב';
    }

    if (hour >= 12 && hour < 18) {
      return 'צהריים טובים';
    }

    return 'ערב טוב';
  };
  return (
      <Box sx={{ width: '100%', height: '100vh', px: 2, pt: 0.5, pb: 1, display: 'flex', flexDirection: 'column' }}>



        <Typography
            variant="h8"
            sx={{
              fontWeight: 700,
              color: '#1e3a8a',
              textAlign: 'right',
            }}
        >

          <Box display="flex" justifyContent="space-between" mb={0.25} >

            {getGreeting()}, {user?.firstNameMan || user?.firstNameWoman || 'משתמש'}
            <Button
                variant="outlined"
                size="small"
                onClick={handleLogout}
                sx={{ textTransform: 'none', px: 2, borderRadius: 2 }}

            >
              יציאה

            </Button>

          </Box>
        </Typography>

        {error && (
            <Typography color="error" variant="body2" mb={1}>
              {error}
            </Typography>
        )}

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DataTable
              records={records}
              loading={loading}
              onSave={handleSave}
              onAutoSave={handleAutoSaveLocal}
              onSelectionChange={setSelectedRows}
              onDeleteRows={handleDeleteRows}
              initialSelectedIds={initialSelectedIds}
              onImport={handleImport}
              onOpenPrint={() => setIsPrintModalOpen(true)}
          />
        </Box>

        {/* רנדור המודאל והעברת הרשומות המסומנות אליו */}
        <PrintModal
            open={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            selectedRows={selectedRows}
            records={records}
        />
      </Box>
  );}
