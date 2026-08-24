import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { getExcelColumns } from '../services/excelColumnsCache';
import { parseColumnPreferences, PRINT_DEFAULT_FIELDS } from '../utils/columnPreferences';
import api from '../services/api';

function getLoggedUser() {
  const raw = sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = getLoggedUser();
  const [view, setView] = useState('menu'); // 'menu' | 'columns'
  const [fieldDefs, setFieldDefs] = useState([]);
  const [prefs, setPrefs] = useState(() => parseColumnPreferences(user?.columnPreferences));
  const [savedOpen, setSavedOpen] = useState(false);

  useEffect(() => {
    getExcelColumns().then(setFieldDefs).catch(() => setFieldDefs([]));
  }, []);

  const getFlag = (technicalName, key) => {
    const saved = prefs[technicalName]?.[key];
    if (saved !== undefined) return saved;
    if (key === 'show') {
      const f = fieldDefs.find((d) => d.technicalName === technicalName);
      return Boolean(f?.defaultOrder);
    }
    return PRINT_DEFAULT_FIELDS.has(technicalName);
  };

  const toggleFlag = (technicalName, key) => {
    setPrefs((prev) => ({
      ...prev,
      [technicalName]: {
        show: getFlag(technicalName, 'show'),
        print: getFlag(technicalName, 'print'),
        [key]: !getFlag(technicalName, key),
      },
    }));
  };

  const handleSave = async () => {
    const columnPreferences = JSON.stringify(prefs);
    let updatedUser = { ...user, columnPreferences };
    try {
      const response = await api.updateColumnPreferences(user.phone, columnPreferences);
      updatedUser = response.data;
    } catch {
      // אם קריאת השרת נכשלה, שומרים לפחות מקומית כדי שהשינוי לא ילך לאיבוד בטעות
    }
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    setSavedOpen(true);
  };

  const columnList = (key, title) => (
    <Box sx={{ flex: 1, minWidth: 260 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
        {title}
      </Typography>
      <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 0.5 }}>
        {fieldDefs.map((f) => (
          <ListItemButton
            key={f.technicalName}
            onClick={() => toggleFlag(f.technicalName, key)}
            sx={{ borderRadius: 1.5 }}
          >
            <Checkbox
              checked={getFlag(f.technicalName, key)}
              tabIndex={-1}
              disableRipple
            />
            <ListItemText primary={f.displayName} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', px: 3, py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton
          onClick={() => (view === 'menu' ? navigate('/') : setView('menu'))}
        >
          <ArrowForwardIcon />
        </IconButton>
        {view === 'menu' ? (
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            הגדרות
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h5"
              onClick={() => setView('menu')}
              sx={{ fontWeight: 500, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#0f172a' } }}
            >
              הגדרות
            </Typography>
            <Typography variant="h5" sx={{ color: '#94a3b8' }}>‹</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
              ניהול עמודות
            </Typography>
          </Box>
        )}
      </Box>

      {view === 'menu' && (
        <List sx={{ maxWidth: 420 }}>
          <ListItemButton
            onClick={() => setView('columns')}
            sx={{ borderRadius: 2, border: '1px solid #e2e8f0', gap: 1.5 }}
          >
            <ViewColumnOutlinedIcon sx={{ color: '#475569' }} />
            <ListItemText primary="ניהול עמודות" secondary="בחירת עמודות להצגה בטבלה ולהדפסה במדבקה" />
          </ListItemButton>
        </List>
      )}

      {view === 'columns' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {columnList('show', 'עמודות להצגה')}
            {columnList('print', 'עמודות להדפסה')}
          </Box>
          <Button variant="contained" onClick={handleSave} sx={{ mt: 3 }}>
            שמור
          </Button>
        </Box>
      )}

      <Snackbar
        open={savedOpen}
        autoHideDuration={2500}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" icon={false} sx={{ bgcolor: '#60a5fa', color: '#fff' }}>
          נשמר בהצלחה
        </Alert>
      </Snackbar>
    </Box>
  );
}