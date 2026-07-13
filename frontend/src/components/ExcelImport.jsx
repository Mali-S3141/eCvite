import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { getExcelColumns, invalidateExcelColumnsCache } from '../services/excelColumnsCache';
import { matchExcelHeaders, matchByValues, remapRows } from '../utils/excelColumnMatcher';
import ColumnMatchDialog, { IGNORE_VALUE } from './ColumnMatchDialog';

export default function ExcelImport({ onImport, onOpenPrint }) {
  const [fileName, setFileName] = useState('');
  const [matchError, setMatchError] = useState('');
  const [pending, setPending] = useState(null); // { json, matched, unmatchedHeaders, columns }

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
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

      // עמודות שלא זוהו לפי הכותרת - ננסה לזהות לפי הערכים שבתוכן (למשל סיומות/קידומות)
      const { matched: matchedByValues, unmatched: stillUnmatched } = matchByValues(unmatched, json, columns);
      Object.assign(matched, matchedByValues);

      if (stillUnmatched.length > 0) {
        // מציגים למשתמשת מסך התאמה ידנית - הייבוא ימשיך רק אחרי שהיא תבחר/תדלג
        setPending({ json, matched, unmatchedHeaders: stillUnmatched, columns });
        return;
      }

      onImport(remapRows(json, matched));
    } catch (err) {
      console.error('לא ניתן היה לטעון את הגדרות השדות מהשרת:', err);
      setMatchError('לא ניתן היה להתאים עמודות אוטומטית (השרת לא זמין) - הקובץ יובא כמו שהוא.');
      onImport(json);
    }
  };

  const handleDialogConfirm = async (choices) => {
    const { json, matched, unmatchedHeaders } = pending;
    setPending(null);

    const finalMatched = { ...matched };
    const aliasesToSave = [];
    unmatchedHeaders.forEach((header) => {
      const technicalName = choices[header];
      if (technicalName && technicalName !== IGNORE_VALUE) {
        finalMatched[header] = technicalName;
        aliasesToSave.push({ header, technicalName });
      }
    });

    // שומרים את הבחירה כ"כינוי" חדש בטבלה - כדי שבפעם הבאה זה יזוהה אוטומטית
    if (aliasesToSave.length > 0) {
      await Promise.all(
        aliasesToSave.map(({ header, technicalName }) =>
          api.addExcelColumnAlias(technicalName, header).catch((err) => {
            console.error('לא ניתן היה לשמור את הכינוי החדש:', err);
          })
        )
      );
      // מבטלים את המטמון כדי שהייבוא הבא (גם באותה טעינת דף) יכיר את הכינוי החדש מיד
      invalidateExcelColumnsCache();
    }

    onImport(remapRows(json, finalMatched));
  };

  const handleDialogCancel = () => {
    const { json, matched } = pending;
    setPending(null);
    onImport(remapRows(json, matched));
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
      {matchError && (
        <Typography color="error" variant="body2">
          {matchError}
        </Typography>
      )}
      {pending && (
        <ColumnMatchDialog
          open
          unmatchedHeaders={pending.unmatchedHeaders}
          columns={pending.columns}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </Box>
  );
}
