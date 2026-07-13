import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';
import { getExcelColumns } from '../services/excelColumnsCache';
import { matchExcelHeaders, remapRows } from '../utils/excelColumnMatcher';

export default function ExcelImport({ onImport, onOpenPrint }) {
  const [fileName, setFileName] = useState('');
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [matchError, setMatchError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUnmatchedCount(0);
    setMatchError('');

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (json.length === 0) {
      onImport(json);
      return;
    }

    try {
      // columns נטען פעם אחת בלבד (getExcelColumns ממטמנת), לא בכל ייבוא
      const columns = await getExcelColumns();
      const headers = Object.keys(json[0]);
      const { matched, unmatched } = matchExcelHeaders(headers, columns);

      if (unmatched.length > 0) {
        // שלב הבא: מסך שיאפשר להתאים ידנית את העמודות האלה. בינתיים הן מדולגות ולא מיובאות.
        setUnmatchedCount(unmatched.length);
        console.warn('עמודות שלא הותאמו אוטומטית:', unmatched);
      }

      onImport(remapRows(json, matched));
    } catch (err) {
      console.error('לא ניתן היה לטעון את הגדרות השדות מהשרת:', err);
      setMatchError('לא ניתן היה להתאים עמודות אוטומטית (השרת לא זמין) - הקובץ יובא כמו שהוא.');
      onImport(json);
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Button variant="contained" component="label">
        ייבוא Excel
        <input hidden type="file" accept=".xlsx,.xls" onChange={handleFile} />
      </Button>
       <Button variant="outlined" onClick={onOpenPrint}>
        הדפסה
       </Button>
      {fileName && <Typography>{fileName}</Typography>}
      {unmatchedCount > 0 && (
        <Typography color="error" variant="body2">
          {unmatchedCount} עמודות מהקובץ לא זוהו אוטומטית ולא יובאו (בקרוב: אפשרות להתאים ידנית)
        </Typography>
      )}
      {matchError && (
        <Typography color="error" variant="body2">
          {matchError}
        </Typography>
      )}
    </Box>
  );
}
