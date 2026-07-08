import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography, TextField, Chip } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

const defaultColumns = [
  { field: 'prefix', headerName: 'קידומת', width: 100, editable: true },
  { field: 'man', headerName: 'בעל', width: 150, editable: true },
  { field: 'woman', headerName: 'אישה', width: 150, editable: true },
  { field: 'lastName', headerName: 'שם משפחה', width: 150, editable: true },
  { field: 'suffix', headerName: 'סיומת', width: 100, editable: true },
  { field: 'fatherName', headerName: 'שם האב', width: 150, editable: true },
  { field: 'motherName', headerName: 'שם האם', width: 150, editable: true },
  { field: 'phone', headerName: 'טלפון', width: 150, editable: true },
  { field: 'mail', headerName: 'מייל', width: 200, editable: true },
  { field: 'country', headerName: 'מדינה', width: 120, editable: true },
  { field: 'city', headerName: 'עיר', width: 140, editable: true },
  { field: 'street', headerName: 'רחוב', width: 150, editable: true },
  { field: 'houseNo', headerName: 'מס\' בית', width: 100, editable: true },
  { field: 'belongsTo', headerName: 'שייך ל', width: 150, editable: true },
  { field: 'display', headerName: 'תצוגה', width: 180, editable: true },
  { field: 'print', headerName: 'הדפסה', width: 100, editable: true, type: 'boolean' },
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

export default function DataTable({ records, loading, onSave, onAutoSave, onSelectionChange }) {
  const [rows, setRows] = useState(records);
  const [selectionModel, setSelectionModel] = useState([]);
  const [sortModel, setSortModel] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [inputValue, setInputValue] = useState('');


  useEffect(() => {
    setRows(records)
  }, [records]);

 const handleSaveClick = () => {
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
      street: '',
      houseNo: '',
      belongsTo: '',
      display: '',
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
  };

 const processRowUpdate = (newRow) => {   
    const updatedRows = rows.map((row) => (row.id === newRow.id ? newRow : row));   
    setRows(updatedRows);   
    onAutoSave(updatedRows); 
    return newRow;   
  };

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
          row.street?.toLowerCase().includes(word) ||
          row.houseNo?.toLowerCase().includes(word) ||
          row.belongsTo?.toLowerCase().includes(word) ||
          row.display?.toLowerCase().includes(word)
        );
      });
    });
  }, [rows, activeFilters, inputValue]);
 const columns = useMemo(
    () => [
      ...defaultColumns,
      {
        field: 'actions',
        headerName: 'פעולות',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: () => <Typography variant="body2">עריכה</Typography>,
      },
    ],
    []
  );

  return (
    <Paper sx={{ height: 720, width: '100%' }}>
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

   <DataGrid
        rows={filteredRows}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableSelectionOnClick
        components={{ Toolbar: GridToolbar }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
          columns: {
            columnVisibilityModel: SYSTEM_FIELDS_HIDDEN_BY_DEFAULT,
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
    </Paper>
  );
}