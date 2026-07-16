import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { getExcelColumns, invalidateExcelColumnsCache } from '../services/excelColumnsCache';
import { matchExcelHeaders, matchByValues, remapRows } from '../utils/excelColumnMatcher';
import ColumnMatchDialog, { IGNORE_VALUE } from './ColumnMatchDialog';

// Object.keys מקדימה כותרות שהן מספרים טהורים (כמו "1") להתחלה, גם אם הן בפועל העמודה
// האחרונה בקובץ - קוראים את שורת הכותרות כמערך (ששומר על הסדר האמיתי מהקובץ) ובונים
// לפיו את אותם שמות "__EMPTY"/"__EMPTY_1" ש-sheet_to_json הרגיל היה מייצר, כדי לסדר נכון
function getTrueHeaderOrder(sheet) {
  const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] || [];
  let emptyCount = 0;
  return headerRow.map((cell) => {
    const text = String(cell ?? '').trim();
    if (text) return text;
    const name = emptyCount === 0 ? '__EMPTY' : `__EMPTY_${emptyCount}`;
    emptyCount += 1;
    return name;
  });
}

// שורה שאין בה כלום בעמודת מדינה - כנראה כי לא כתבו שם משהו במיוחד - מקבלת כברירת מחדל "ישראל"
function applyDefaultCountry(rows) {
  return rows.map((row) =>
    String(row.country ?? '').trim() ? row : { ...row, country: 'ישראל' }
  );
}

export default function ExcelImport({ onImport }) {
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

    // קוראים את כל הגליונות בקובץ (לא רק את הראשון) - כדי לא לפספס גליון נוסף
    // (למשל גליון של כתובות בארץ וגליון נפרד של כתובות בחו"ל) - כולם מיובאים לאותה טבלה
    const sheetsData = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return {
        json: XLSX.utils.sheet_to_json(sheet, { defval: '' }),
        trueOrder: getTrueHeaderOrder(sheet),
      };
    }).filter((s) => s.json.length > 0);

    const json = sheetsData.flatMap((s) => s.json);

    if (json.length === 0) {
      onImport(json);
      return;
    }

    try {
      // columns נטען פעם אחת בלבד (getExcelColumns ממטמנת), לא בכל ייבוא
      const columns = await getExcelColumns();

      // בונים רשימת כותרות מאוחדת מכל הגליונות יחד (בלי כפילויות, לפי סדר הופעה),
      // כדי שההתאמה תתייחס לכל הכותרות שבקובץ ולא רק לגליון הראשון
      const seenHeaders = new Set();
      const headers = [];
      sheetsData.forEach(({ json: sheetJson, trueOrder }) => {
        const sheetHeaders = Object.keys(sheetJson[0]).sort(
          (a, b) => trueOrder.indexOf(a) - trueOrder.indexOf(b)
        );
        sheetHeaders.forEach((header) => {
          if (!seenHeaders.has(header)) {
            seenHeaders.add(header);
            headers.push(header);
          }
        });
      });

      const { matched, unmatched } = matchExcelHeaders(headers, columns);

      // עמודות שלא זוהו לפי הכותרת - ננסה לזהות לפי הערכים שבתוכן (למשל סיומות/קידומות)
      const { matched: matchedByValues, unmatched: stillUnmatched } = matchByValues(unmatched, json, columns);
      Object.assign(matched, matchedByValues);

      // עמודות שאין בהן שום נתון בקובץ בכלל - אין טעם לשאול עליהן, פשוט מדלגים
      const unmatchedWithData = stillUnmatched.filter((header) =>
        json.some((row) => String(row[header] ?? '').trim() !== '')
      );

      if (unmatchedWithData.length > 0) {
        // מציגים למשתמשת מסך התאמה ידנית - הייבוא ימשיך רק אחרי שהיא תבחר/תדלג
        setPending({ json, matched, unmatchedHeaders: unmatchedWithData, columns });
        return;
      }

      onImport(applyDefaultCountry(remapRows(json, matched)));
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

    onImport(applyDefaultCountry(remapRows(json, finalMatched)));
  };

  const handleDialogCancel = () => {
    const { json, matched } = pending;
    setPending(null);
    onImport(applyDefaultCountry(remapRows(json, matched)));
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Button
        variant="outlined"
        component="label"
        size="small"
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          bgcolor: '#ffffff',
          color: '#1e293b',
          borderColor: '#e2e8f0',
          '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
        }}
      >
        ייבוא Excel
        <input hidden type="file" accept=".xlsx,.xls" onChange={handleFile} />
      </Button>
      {fileName && (
        <Typography variant="caption" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </Typography>
      )}
      {matchError && (
        <Typography color="error" variant="caption">
          {matchError}
        </Typography>
      )}
      {pending && (
        <ColumnMatchDialog
          open
          unmatchedHeaders={pending.unmatchedHeaders}
          columns={pending.columns}
          rows={pending.json}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </Box>
  );
}
