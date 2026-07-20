import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography, TextField, Chip, Alert, Menu, MenuItem, IconButton } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DataGrid, GridToolbar, useGridApiRef } from '@mui/x-data-grid';
import { getExcelColumns } from '../services/excelColumnsCache';

// מספר בית: ספרות, ואפשר אות אחת בסוף (כמו "12" או "12א")
const HOUSE_NO_PATTERN = /^\d+[a-zA-Zא-ת]?$/;

// שדות מערכת/ביקורת (לא "פרטי אורח") - לא מנוהלים דרך excel_columns, נשארים קבועים בקוד
const systemColumns = [
  { field: 'hashCode', headerName: 'מפתח', width: 120, editable: false },
  { field: 'changed', headerName: 'שונה', width: 100, editable: false, type: 'boolean' },
  { field: 'changeDate', headerName: 'תאריך שינוי', width: 130, editable: false },
  { field: 'changeBy', headerName: 'שונה ע"י', width: 130, editable: false },
  { field: 'createdBy', headerName: 'נוצר ע"י', width: 130, editable: false },
];

const SYSTEM_FIELDS_HIDDEN_BY_DEFAULT = {
  hashCode: false,
  changed: false,
  changeDate: false,
  changeBy: false,
  createdBy: false,
};

// עמודות כתובת - מהן אפשר להעביר ערך שלא מתאים לעמודת "הערת כתובת" (קליק ימני על התא)
const ADDRESS_FIELDS = ['country', 'city', 'neighborhood', 'street', 'houseNo'];

// המיון המובנה של הטבלה (Intl.Collator() בלי locale) לא ממיין נכון לפי א'-ב' עברי -
// collator עם locale 'he' ממיין נכון, וגם numeric:true נותן סדר טבעי למספרים (כמו במספר בית)
const hebrewCollator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });

// כשעמודה שממיינים בה שווה בין שתי שורות (לדוגמה שתי שורות עם אותו שם פרטי) - "תת המיון"
// שובר את השוויון לפי שרשרת עמודות נוספות שהמשתמשת בוחרת בעצמה (אפשר כמה, לפי סדר עדיפות),
// כל אחת לפי א'-ב'. ה-DataGrid בגרסה הזו (Community) תומך רק בעמודת מיון אחת בו-זמנית,
// אז זו הדרך היחידה לקבל בפועל "מיון בתוך מיון" בלי לשדרג לגרסת Pro בתשלום
function createTextSortComparator(field, secondaryFields) {
  return (value1, value2, param1, param2) => {
    const primary = hebrewCollator.compare(String(value1 ?? ''), String(value2 ?? ''));
    if (primary !== 0) return primary;

    const row1 = param1.api.getRow(param1.id);
    const row2 = param2.api.getRow(param2.id);
    for (const secondaryField of secondaryFields) {
      if (secondaryField === field) continue;
      const secondary = hebrewCollator.compare(
        String(row1?.[secondaryField] ?? ''),
        String(row2?.[secondaryField] ?? '')
      );
      if (secondary !== 0) return secondary;
    }
    return 0;
  };
}

export default function DataTable({
                                      records,
                                      loading,
                                      onSave,
                                      onAutoSave,
                                      onSelectionChange,
                                      onDeleteRows,
                                      initialSelectedIds,
                                      importedColumns
                                  }){
  const [rows, setRows] = useState(records);
  const [selectionModel, setSelectionModel] = useState(initialSelectedIds || []);
  const [sortModel, setSortModel] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [fieldDefs, setFieldDefs] = useState([]);

  const [problemQueue, setProblemQueue] = useState([]); // תורי תאים שצריך לתקן לפני שמירה - {id, field}
  const [contextMenu, setContextMenu] = useState(null); // { mouseX, mouseY, id, field } - קליק ימני על תא כתובת
  const [secondarySortFields, setSecondarySortFields] = useState([]); // תת-מיון: שרשרת עמודות לשבירת שוויון, לפי בחירת המשתמשת
  const appliedInitialSelection = useRef(false);
  const apiRef = useGridApiRef();
  // ה-columns מחושבות רק פעם אחת (memo תלוי ב-fieldDefs) והפעולות שבתוכן (renderCell)
  // צריכות תמיד את השורות העדכניות ביותר - לכן משתמשים ב-ref ולא סוגרים על rows ישירות
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const gridContainerRef = useRef(null);

  // ל-DataGrid (בגרסה הזו) אין prop מובנה של onCellContextMenu - לכן מאזינים ישירות
  // לאירוע contextmenu הטבעי של הדפדפן על הקונטיינר, ומזהים את התא/שורה לפי data-field/data-id
    useEffect(() => {
        if (importedColumns && importedColumns.length > 0) {
            console.log("עמודות שהגיעו מהייבוא:", importedColumns);
        }

    }, [importedColumns]);
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return undefined;

    const handleNativeContextMenu = (event) => {
      const cellEl = event.target.closest('.MuiDataGrid-cell');
      if (!cellEl) return;
      const field = cellEl.getAttribute('data-field');
      if (!ADDRESS_FIELDS.includes(field)) return;
      const rowEl = event.target.closest('.MuiDataGrid-row');
      const id = rowEl ? rowEl.getAttribute('data-id') : null;
      if (!id) return;

      event.preventDefault();
      setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, id, field });
    };

    container.addEventListener('contextmenu', handleNativeContextMenu);
    return () => container.removeEventListener('contextmenu', handleNativeContextMenu);
  }, []);

  // סדר העמודות ומה מוצג כברירת מחדל נקבעים ב-excel_columns (ב-Neon), לא בקוד -
  // נטען פעם אחת (getExcelColumns ממטמנת) ולא בכל טעינה מחדש
    useEffect(() => {
        getExcelColumns()
            .then((data) => {
                console.log("fieldDefs הגיעו:", data);
                setFieldDefs(data);
            })
            .catch((err) => {
                console.error("שגיאה בטעינת עמודות:", err);
                setFieldDefs([]);
            });
    }, []);

  useEffect(() => {
    setRows(records)
  }, [records]);

  // משחזרת פעם אחת בלבד את הבחירה שהייתה קיימת (חוזרים מתצוגה מקדימה), ברגע שהשורות נטענות
  useEffect(() => {
    if (!appliedInitialSelection.current && rows.length && initialSelectedIds && initialSelectedIds.length) {
      const matched = rows.filter((row) => initialSelectedIds.includes(row.id));
      if (matched.length) {
        onSelectionChange(matched);
      }
      appliedInitialSelection.current = true;
    }
  }, [rows, initialSelectedIds, onSelectionChange]);

 const handleSaveClick = () => {
    const problems = findProblemCells(rows);
    if (problems.length > 0) {
      // מנקים סינון/מיון כדי שכל השורות יהיו גלויות בסדר קבוע - כדי שאפשר יהיה לקפוץ ביניהן
      setActiveFilters([]);
      setInputValue('');
      setSortModel([]);
      setProblemQueue(problems);
      return;
    }
    onSave(rows);
  };

  const handleAddRow = () => {
    const nextId = rows.length ? Math.max(...rows.map((row) => row.id || 0)) + 1 : 1;
    const newRow = {
      id: nextId,
      prefix: '',
      man: '',
      woman: '',
      lastName: '',
      suffix: '',
      fatherName: '',
      motherName: '',
      phone: '',
      mail: '',
      country: 'ישראל',
      city: '',
      neighborhood: '',
      street: '',
      houseNo: '',
      addressNote: '',
      belongsTo: '',
      print: false,
    };
    setRows((prevRows) => [newRow, ...prevRows]);


  };

  const handleDeleteRows = () => {
    const updatedRows = rows.filter((row) => !selectionModel.includes(row.id));
    setRows(updatedRows);
    setSelectionModel([]);
    onSelectionChange([]);
    onAutoSave(updatedRows);
    // מחיקה מפורשת מיידית בשרת - רק השורות שבאמת סומנו ונלחצו עליהן "מחק", לא לפי השוואת רשימה
    if (onDeleteRows) {
      onDeleteRows(selectionModel);
    }
  };

 const processRowUpdate = (newRow) => {
    const updatedRows = rows.map((row) => (row.id === newRow.id ? newRow : row));
    setRows(updatedRows);
    onAutoSave(updatedRows);

    // אם אנחנו באמצע תהליך תיקון (אחרי שמירה שנחסמה) - בודקים מה עוד נשאר לתקן
    // ומקפיצים אוטומטית לבעיה הבאה; אם הכל תוקן - שומרים בפועל
    if (problemQueue.length > 0) {
      const remaining = findProblemCells(updatedRows);
      setProblemQueue(remaining);
      if (remaining.length === 0) {
        onSave(updatedRows);
      }
    }

    return newRow;
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  // מעבירה את הערך מתא בעמודת כתובת (כשהוא לא מתאים) לעמודת "הערת כתובת" -
  // ומרוקנת את התא המקורי. אם כבר יש תוכן בהערת הכתובת, משרשרת אליו במקום לדרוס
  const moveValueToAddressNote = useCallback((id, field) => {
    const updatedRows = rowsRef.current.map((row) => {
      if (String(row.id) !== String(id)) return row;
      const value = String(row[field] ?? '').trim();
      if (!value) return row;
      const existingNote = String(row.addressNote ?? '').trim();
      return {
        ...row,
        [field]: '',
        addressNote: existingNote ? `${existingNote} ${value}` : value,
      };
    });
    setRows(updatedRows);
    onAutoSave(updatedRows);
  }, [onAutoSave]);

  const handleMoveToAddressNote = () => {
    if (!contextMenu) return;
    moveValueToAddressNote(contextMenu.id, contextMenu.field);
    setContextMenu(null);
  };

  // אייקון קטן שמופיע כשעוברים עם העכבר על תא בעמודת כתובת - לחיצה עליו מעבירה
  // את הערך ישירות ל"הערת כתובת", כדי שהאפשרות תהיה גלויה ולא רק דרך קליק ימני
  const renderAddressCell = useCallback((params) => {
    const value = params.value ? String(params.value) : '';
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          overflow: 'hidden',
          '&:hover .move-to-note-icon': { opacity: 1 },
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        {value && (
          <IconButton
            className="move-to-note-icon"
            size="small"
            title="העבר להערת כתובת"
            sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.25, flexShrink: 0 }}
            onClick={(event) => {
              event.stopPropagation();
              moveValueToAddressNote(params.id, params.field);
            }}
          >
            <SwapHorizIcon fontSize="inherit" />
          </IconButton>
        )}
      </Box>
    );
  }, [moveValueToAddressNote]);

    const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedWord = inputValue.trim();
      
      if (trimmedWord && !activeFilters.includes(trimmedWord)) {
        setActiveFilters([...activeFilters, trimmedWord]);
      }
      setInputValue(''); 
    }
  };

  const handleRemoveChip = (chipToRemove) => {
    setActiveFilters(activeFilters.filter((c) => c !== chipToRemove));
  };

  const handleFullReset = () => {
    setActiveFilters([]);
    setInputValue('');
    setSortModel([]);
    setSecondarySortFields([]);
  };

  // לוגיקת תת-הסינון והפילטור המשולב
  const filteredRows = useMemo(() => {
    const currentWord = inputValue.trim().toLowerCase();
    const allWords = [...activeFilters.map(f => f.toLowerCase())];
    if (currentWord) allWords.push(currentWord);

    if (allWords.length === 0) return rows;

    return rows.filter((row) => {
      return allWords.every((word) => {
        return (
          row.man?.toLowerCase().includes(word) ||
          row.woman?.toLowerCase().includes(word) ||
          row.lastName?.toLowerCase().includes(word) ||
          row.fatherName?.toLowerCase().includes(word) ||
          row.motherName?.toLowerCase().includes(word) ||
          row.phone?.toLowerCase().includes(word) ||
          row.mail?.toLowerCase().includes(word) ||
          row.country?.toLowerCase().includes(word) ||
          row.city?.toLowerCase().includes(word) ||
          row.neighborhood?.toLowerCase().includes(word) ||
          row.street?.toLowerCase().includes(word) ||
          row.houseNo?.toLowerCase().includes(word) ||
          row.addressNote?.toLowerCase().includes(word) ||
          row.belongsTo?.toLowerCase().includes(word)
        );
      });
    });
  }, [rows, activeFilters, inputValue]);
 const requiredFields = useMemo(
    () => new Set(fieldDefs.filter((f) => f.isRequired).map((f) => f.technicalName)),
    [fieldDefs]
  );

  // בדיקת מדינה/עיר מול ה-API החיצוני הוסרה - הרשימה שם רק באנגלית, בעוד הנתונים כאן
  // בעברית, כך שכל ערך אמיתי היה נפסל בטעות. נשארה רק בדיקת הפורמט של מספר בית.
  const isValueInvalid = (field, value) => {
    if (!value) return false;
    const text = String(value).trim();
    if (!text) return false;
    if (field === 'houseNo') return !HOUSE_NO_PATTERN.test(text);
    return false;
  };

    const orderedFieldDefs = useMemo(
        () =>
            (importedFieldDefs.length > 0 ? importedFieldDefs : fieldDefs)
                .slice()
                .sort((a, b) => (a.defaultOrder ?? 999) - (b.defaultOrder ?? 999)),
        [fieldDefs, importedFieldDefs]
    );
  const orderedFieldNames = useMemo(() => orderedFieldDefs.map((f) => f.technicalName), [orderedFieldDefs]);

  // סורקת את כל השורות (לפי סדר השורות והעמודות בטבלה) ומחזירה רשימה מסודרת של
  // תאים שצריך לתקן - שדות חובה ריקים או ערכים לא תקינים - כדי לדעת לאיזה תא לקפוץ קודם
  const findProblemCells = (rowsToCheck) => {
    const problems = [];
    rowsToCheck.forEach((row) => {
      orderedFieldNames.forEach((field) => {
        const value = row[field];
        const isRequiredEmpty = requiredFields.has(field) && !value;
        if (isRequiredEmpty || isValueInvalid(field, value)) {
          problems.push({ id: row.id, field });
        }
      });
    });
    return problems;
  };

  const columns = useMemo(() => {
    const dynamicColumns = orderedFieldDefs.map((f) => {
      const isBoolean = f.technicalName === 'print';
      return {
        field: f.technicalName,
        headerName: f.isRequired ? `${f.displayName} *` : f.displayName,
        width: isBoolean ? 100 : 200,
        editable: true,
        type: isBoolean ? 'boolean' : undefined,
        renderCell: ADDRESS_FIELDS.includes(f.technicalName) ? renderAddressCell : undefined,
        sortComparator: isBoolean ? undefined : createTextSortComparator(f.technicalName, secondarySortFields),
      };
    });

    return [
      ...dynamicColumns,
      ...systemColumns,
      {
        field: 'actions',
        headerName: 'פעולות',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: () => <Typography variant="body2">עריכה</Typography>,
      },
    ];
  }, [orderedFieldDefs, renderAddressCell, secondarySortFields]);

  const handleAddSecondarySort = (field) => {
    if (!field || secondarySortFields.includes(field)) return;
    setSecondarySortFields((prev) => [...prev, field]);
  };

  const handleRemoveSecondarySort = (field) => {
    setSecondarySortFields((prev) => prev.filter((f) => f !== field));
  };

  // ה-DataGrid לא מחשב מחדש את סדר השורות אם רק ה-sortComparator של העמודה השתנה בזמן
  // שה-sortModel עצמו (עמודת המיון הראשית) נשאר זהה - אז כשתת-המיון משתנה, "דוחפים"
  // מחדש את אותו sortModel (מערך חדש עם אותו תוכן) כדי לגרום לו לחשב מחדש בפועל
  useEffect(() => {
    setSortModel((prev) => (prev.length ? [...prev] : prev));
  }, [secondarySortFields]);

  // שדות עם סדר תצוגה 0 (או ללא סדר) מוסתרים כברירת מחדל, לפי ההגדרה ב-excel_columns
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(SYSTEM_FIELDS_HIDDEN_BY_DEFAULT);

  useEffect(() => {
    if (fieldDefs.length === 0) return;
    const model = { ...SYSTEM_FIELDS_HIDDEN_BY_DEFAULT };
    fieldDefs.forEach((f) => {
      if (!f.defaultOrder) {
        model[f.technicalName] = false;
      }
    });
    setColumnVisibilityModel(model);
  }, [fieldDefs]);

  // בכל פעם שתור התיקונים מתעדכן (שמירה נחסמה, או שתוקן תא אחד וקפצנו לבא) -
  // גוללים, ממקדים ופותחים לעריכה את התא הראשון בתור
  useEffect(() => {
    if (problemQueue.length === 0 || !apiRef.current) return undefined;
    const target = problemQueue[0];
    const rowIndex = filteredRows.findIndex((row) => row.id === target.id);
    if (rowIndex === -1) return undefined;

    const colIndex = apiRef.current.getColumnIndex(target.field);
    apiRef.current.scrollToIndexes({ rowIndex, colIndex });
    apiRef.current.setCellFocus(target.id, target.field);
    // עריכה כאן היא ברמת שורה (editMode="row") - פותחים את כל השורה לעריכה
    // וממקדים בפועל בשדה הבעייתי הספציפי
      const timer = setTimeout(() => {
          try {
              const mode = apiRef.current.getRowMode(target.id);

              if (mode === 'view') {apiRef.current.startRowEditMode({
                  id: target.id
              });
              }
          } catch (err) {
              console.warn("לא ניתן לפתוח עריכה בשורה:", err);
          }
      }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemQueue, filteredRows]);

  return (
    <Paper
      sx={{
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid #e6e8ec',
        boxShadow: '0 6px 28px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #eef0f3',
          background: 'linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>
          טבלת רשומות - עריכה בסגנון Excel
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            onClick={handleAddRow}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              bgcolor: '#4f46e5',
              '&:hover': { bgcolor: '#4338ca', boxShadow: '0 6px 16px rgba(79, 70, 229, 0.28)' },
            }}
          >
            הוסף שורה
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteRows}
            disabled={!selectionModel.length}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            מחק שורות
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveClick}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b', boxShadow: '0 6px 16px rgba(15, 23, 42, 0.28)' },
            }}
          >
            שמור שינויים
          </Button>
        </Stack>
      </Box>

        {/* סרגל סינון ופילטור משולב */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, m: 2.5, mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #eef0f3' }}>
        <Typography variant="body2" fontWeight="bold" color="text.secondary">סינון ופילטור מהיר:</Typography>

        <TextField
          label="הקלידי ערך ולחצי Enter לנעילת סינון/פילטור..."
          variant="outlined"
          size="small"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          sx={{ width: 380, bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {/* תצוגת התגיות */}
        <Stack direction="row" spacing={1}>
          {activeFilters.map((filter, index) => (
            <Chip
              key={index}
              label={filter}
              onDelete={() => handleRemoveChip(filter)}
              color="primary"
              variant="contained"
              size="small"
            />
          ))}
        </Stack>

        {/* תת-מיון: כשממיינים לפי עמודה כלשהי (בלחיצה על החץ בכותרת), שורות ששוות בה
            יישברו לפי שרשרת העמודות הנוספות שנבחרות כאן, לפי סדר ההוספה - אפשר להוסיף
            כמה שרוצים, ואפשר לשנות את הבחירה גם אחרי שכבר ממויין */}
        <TextField
          select
          label="הוסיפי תת-מיון"
          size="small"
          value=""
          onChange={(e) => handleAddSecondarySort(e.target.value)}
          sx={{ width: 180, bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          {orderedFieldDefs
            .filter((f) => !secondarySortFields.includes(f.technicalName))
            .map((f) => (
              <MenuItem key={f.technicalName} value={f.technicalName}>
                {f.displayName}
              </MenuItem>
            ))}
        </TextField>

        {secondarySortFields.length > 0 && (
          <Stack direction="row" spacing={1}>
            {secondarySortFields.map((field, index) => {
              const def = orderedFieldDefs.find((f) => f.technicalName === field);
              return (
                <Chip
                  key={field}
                  label={`${index + 1}. ${def ? def.displayName : field}`}
                  onDelete={() => handleRemoveSecondarySort(field)}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              );
            })}
          </Stack>
        )}

        {/* כפתור איפוס מלא */}
        {(activeFilters.length > 0 || inputValue.trim() !== '' || sortModel.length > 0 || secondarySortFields.length > 0) && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleFullReset}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            בטל סינון/מיון
          </Button>
        )}
      </Box>

      {problemQueue.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2.5, mb: 3, borderRadius: 2 }}>
          יש {problemQueue.length} שדות חובה ריקים או ערכים לא תקינים שצריך לתקן לפני השמירה - קופצים אוטומטית לשדה הבא שצריך תיקון, עד שהכל יתוקן ואז השמירה תתבצע.
        </Alert>
      )}

   <Box ref={gridContainerRef} sx={{ px: 2.5, pb: 2.5 }}>
   <DataGrid
        apiRef={apiRef}
        autoHeight
        rows={filteredRows}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableSelectionOnClick
        components={{ Toolbar: GridToolbar }}
        componentsProps={{
          toolbar: {
            csvOptions: { utf8WithBom: true },
          },
        }}
        getCellClassName={(params) => {
          // התא הספציפי שקפצנו אליו כרגע (הראשון בתור התיקונים) - מודגש הרבה יותר חזק
          // מכל שאר תאי הבעיה, כדי שיהיה ברור בבירור לאיפה קפצו
          if (
            problemQueue.length > 0 &&
            String(params.id) === String(problemQueue[0].id) &&
            params.field === problemQueue[0].field
          ) {
            return 'current-problem-cell';
          }
          if (requiredFields.has(params.field) && !params.value) return 'required-empty-cell';
          if (isValueInvalid(params.field, params.value)) return 'invalid-value-cell';
          return '';
        }}
        sx={{
          border: 'none',
          borderRadius: 2,
          fontSize: '0.875rem',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.01em',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f1f5f9',
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-row': {
            transition: 'background-color 0.15s ease',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8fafc',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '2px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          },
          '& .required-empty-cell': {
            outline: '2px solid #d32f2f',
            outlineOffset: '-2px',
          },
          '& .invalid-value-cell': {
            outline: '2px solid #ed6c02',
            outlineOffset: '-2px',
          },
          '& .current-problem-cell': {
            outline: '3px solid #e11d48',
            outlineOffset: '-3px',
            backgroundColor: '#fff1f2 !important',
            animation: 'current-problem-pulse 1.4s ease-in-out infinite',
          },
          '@keyframes current-problem-pulse': {
            '0%, 100%': { boxShadow: '0 0 0 4px rgba(225, 29, 72, 0.35)' },
            '50%': { boxShadow: '0 0 0 9px rgba(225, 29, 72, 0.08)' },
          },
        }}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={(model) => setColumnVisibilityModel(model)}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[25, 50, 100]}
        experimentalFeatures={{ newEditingApi: true }}
        processRowUpdate={processRowUpdate}
        localeText={{
          toolbarLabel: 'כלים',
          toolbarDensityLabel: 'צפיפות',
          toolbarDensityCompact: 'קומפקטי',
          toolbarDensityStandard: 'רגיל',
          toolbarDensityComfortable: 'נוח',
          toolbarColumns: 'עמודות',
          toolbarColumnsLabel: 'בחר עמודות',
          toolbarFilters: 'סנן',
          toolbarFiltersLabel: 'הראה מסננים',
          toolbarFiltersTooltipHide: 'הסתר מסננים',
          toolbarFiltersTooltipShow: 'הראה מסננים',
          toolbarQuickFilterPlaceholder: 'חיפוש...',
          toolbarExport: 'ייצוא',
          toolbarExportLabel: 'ייצוא',
          toolbarExportCSV: 'הורדה כ־CSV',
          toolbarExportPrint: 'הדפסה',
          columnHeaderFiltersTooltipActive: (count) => `מסננים פעילים: ${count}`,
          columnHeaderFiltersLabel: 'סנן',
          columnHeaderSortIconTooltip: 'מיין',
          columnHeaderSortIconDescription: 'מיין',
          booleanCellTrueLabel: 'כן',
          booleanCellFalseLabel: 'לא',
          columnMenuLabel: 'תפריט',
          columnMenuShowColumns: 'הראה עמודות',
          columnMenuHideColumn: 'הסתר',
          columnMenuUnsort: 'בטל מיון',
          columnMenuSort: 'מיין',
          columnMenuFilter: 'סנן',
          columnMenuManageColumns: 'ניהול עמודות',
          footerTotalRows: 'סה"כ שורות:',
          footerTotalVisibleRows: (visibleCount, totalCount) => `${visibleCount.toLocaleString()} מתוך ${totalCount.toLocaleString()}`,
          filterOperatorContains: 'מכיל',
          filterOperatorEquals: 'שווה',
          filterOperatorStartsWith: 'מתחיל ב',
          filterOperatorEndsWith: 'מסתיים ב',
          filterOperatorIs: 'הוא',
          filterOperatorNot: 'אינו',
          filterOperatorAfter: 'אחרי',
          filterOperatorOnOrAfter: 'בתאריך או אחריו',
          filterOperatorBefore: 'לפני',
          filterOperatorOnOrBefore: 'בתאריך או לפניו',
          filterOperatorIsEmpty: 'ריק',
          filterOperatorIsNotEmpty: 'לא ריק',
          filterOperatorIsAnyOf: 'הוא אחד מ',
          filterValueAny: 'כל אחד',
          filterValueTrue: 'כן',
          filterValueFalse: 'לא',
          columnPinningLeftAriaLabel: 'עמודה מוצמדת לשמאל',
          columnPinningRightAriaLabel: 'עמודה מוצמדת לימין',
          rowGroupingHeaderName: 'קבוצה',
          detailPanelExpandAriaLabel: 'הרחב',
          detailPanelCollapseAriaLabel: 'כווץ',
          pinnedToLeft: 'מוצמד לשמאל',
          pinnedToRight: 'מוצמד לימין',
          unpin: 'בטל הצמדה',
        }}
        editMode="row"
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={(newSelectionModel) => {
          setSelectionModel(newSelectionModel);
          
          const fullSelectedRows = rows.filter((row) => newSelectionModel.includes(row.id));
          onSelectionChange(fullSelectedRows);
        }}
        sortModel={sortModel}
        onSortModelChange={(model) => setSortModel(model)}
      />
   </Box>

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleMoveToAddressNote}>העבר להערת כתובת</MenuItem>
      </Menu>
    </Paper>
  );
}