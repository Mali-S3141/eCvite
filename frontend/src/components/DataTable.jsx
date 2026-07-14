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

export default function DataTable({ records, loading, onSave, onAutoSave, onSelectionChange, onDeleteRows, initialSelectedIds }) {
  const [rows, setRows] = useState(records);
  const [selectionModel, setSelectionModel] = useState(initialSelectedIds || []);
  const [sortModel, setSortModel] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [fieldDefs, setFieldDefs] = useState([]);
  const [problemQueue, setProblemQueue] = useState([]); // תורי תאים שצריך לתקן לפני שמירה - {id, field}
  const [contextMenu, setContextMenu] = useState(null); // { mouseX, mouseY, id, field } - קליק ימני על תא כתובת
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
      .then(setFieldDefs)
      .catch(() => setFieldDefs([]));
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
      country: '',
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
    () => fieldDefs.slice().sort((a, b) => (a.defaultOrder ?? 999) - (b.defaultOrder ?? 999)),
    [fieldDefs]
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
    const dynamicColumns = orderedFieldDefs.map((f) => ({
      field: f.technicalName,
      headerName: f.isRequired ? `${f.displayName} *` : f.displayName,
      width: f.technicalName === 'print' ? 100 : 200,
      editable: true,
      type: f.technicalName === 'print' ? 'boolean' : undefined,
      renderCell: ADDRESS_FIELDS.includes(f.technicalName) ? renderAddressCell : undefined,
    }));

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
  }, [orderedFieldDefs, renderAddressCell]);

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
      apiRef.current.startRowEditMode({ id: target.id, fieldToFocus: target.field });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemQueue, filteredRows]);

  return (
    <Paper sx={{ width: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">טבלת רשומות - עריכה בסגנון Excel</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleAddRow}>
            הוסף שורה
          </Button>
          <Button variant="outlined" color="error" onClick={handleDeleteRows} disabled={!selectionModel.length}>
            מחק שורות
          </Button>
          <Button variant="contained" onClick={handleSaveClick}>
            שמור שינויים
          </Button>
        </Stack>
      </Box>

        {/* סרגל סינון ופילטור משולב */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <Typography variant="body2" fontWeight="bold" color="text.secondary">סינון ופילטור מהיר:</Typography>
        
        <TextField
          label="הקלידי ערך ולחצי Enter לנעילת סינון/פילטור..."
          variant="outlined"
          size="small"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}    
          sx={{ width: 380, bgcolor: '#ffffff' }}
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

        {/* כפתור איפוס מלא */}
        {(activeFilters.length > 0 || inputValue.trim() !== '' || sortModel.length > 0) && (
          <Button variant="outlined" color="error" size="small" onClick={handleFullReset} sx={{ fontWeight: 'bold' }}>
            בטל סינון/מיון
          </Button>
        )}
      </Box>

      {problemQueue.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2, mb: 2 }}>
          יש {problemQueue.length} שדות חובה ריקים או ערכים לא תקינים שצריך לתקן לפני השמירה - קופצים אוטומטית לשדה הבא שצריך תיקון, עד שהכל יתוקן ואז השמירה תתבצע.
        </Alert>
      )}

   <Box ref={gridContainerRef}>
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
          if (requiredFields.has(params.field) && !params.value) return 'required-empty-cell';
          if (isValueInvalid(params.field, params.value)) return 'invalid-value-cell';
          return '';
        }}
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
          },
          '& .required-empty-cell': {
            outline: '2px solid #d32f2f',
            outlineOffset: '-2px',
          },
          '& .invalid-value-cell': {
            outline: '2px solid #ed6c02',
            outlineOffset: '-2px',
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