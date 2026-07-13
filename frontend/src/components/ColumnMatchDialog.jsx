import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Select,
  MenuItem,
  Box,
} from '@mui/material';

const IGNORE_VALUE = '__IGNORE__';

// מסך שמופיע כשיש עמודות בקובץ ה-Excel שלא זוהו אוטומטית - המשתמשת בוחרת ידנית
// לאיזה שדה כל עמודה שייכת (או להתעלם ממנה), והבחירה נשמרת מיד כ"כינוי" חדש לפעם הבאה
export default function ColumnMatchDialog({ open, unmatchedHeaders, columns, onConfirm, onCancel }) {
  const [choices, setChoices] = useState({});

  const handleChange = (header, value) => {
    setChoices((prev) => ({ ...prev, [header]: value }));
  };

  const handleConfirm = () => {
    onConfirm(choices);
    setChoices({});
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>התאמת עמודות שלא זוהו אוטומטית</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          בחרי לאיזה שדה שייכת כל עמודה - הבחירה תישמר אוטומטית גם לייבוא הבא.
        </Typography>
        {unmatchedHeaders.map((header) => (
          <Box key={header} display="flex" alignItems="center" gap={2} mb={2}>
            <Typography sx={{ minWidth: 140 }}>{header}</Typography>
            <Select
              size="small"
              fullWidth
              value={choices[header] ?? IGNORE_VALUE}
              onChange={(e) => handleChange(header, e.target.value)}
            >
              <MenuItem value={IGNORE_VALUE}>להתעלם מהעמודה הזו</MenuItem>
              {columns.map((column) => (
                <MenuItem key={column.technicalName} value={column.technicalName}>
                  {column.displayName}
                </MenuItem>
              ))}
            </Select>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>ביטול</Button>
        <Button variant="contained" onClick={handleConfirm}>
          אישור והמשך ייבוא
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export { IGNORE_VALUE };
