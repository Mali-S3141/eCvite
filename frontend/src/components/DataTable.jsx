import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

const defaultColumns = [
  { field: 'name', headerName: 'שם', width: 180, editable: true },
  { field: 'phone', headerName: 'טלפון', width: 150, editable: true },
  { field: 'city', headerName: 'עיר', width: 140, editable: true },
  { field: 'neighborhood', headerName: 'שכונה', width: 150, editable: true },
  { field: 'street', headerName: 'רחוב', width: 150, editable: true },
  { field: 'houseNumber', headerName: 'מס\' בית', width: 120, editable: true },
  { field: 'address', headerName: 'כתובת', width: 220, editable: true },
  { field: 'email', headerName: 'מייל', width: 220, editable: true },
];

export default function DataTable({ records, loading, onSave, onSelectionChange }) {
  const [rows, setRows] = useState(records);
  const [selectionModel, setSelectionModel] = useState([]);

  useEffect(() => {
    setRows(records);
  }, [records]);

  const handleSaveClick = () => {
    onSave(rows);
  };

  const handleAddRow = () => {
    const nextId = rows.length ? Math.max(...rows.map((row) => row.id || 0)) + 1 : 1;
    const newRow = {
      id: nextId,
      name: '',
      phone: '',
      city: '',
      neighborhood: '',
      street: '',
      houseNumber: '',
      address: '',
      email: '',
    };
    setRows((prevRows) => [newRow, ...prevRows]);
  };

  const handleDeleteRows = () => {
    setRows((prevRows) => prevRows.filter((row) => !selectionModel.includes(row.id)));
    onSelectionChange([]);
  };

  const processRowUpdate = (newRow) => {
    const updatedRows = rows.map((row) => (row.id === newRow.id ? newRow : row));
    setRows(updatedRows);
    return newRow;
  };

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
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableSelectionOnClick
        components={{ Toolbar: GridToolbar }}
        pageSize={25}
        rowsPerPageOptions={[25, 50, 100]}
        onSelectionModelChange={(selection) => {
          setSelectionModel(selection);
          onSelectionChange(selection);
        }}
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
          footerPaginationRowsPerPage: 'שורות בעמוד:',
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
          MuiTablePagination: {
            labelDisplayedRows: ({ from, to, count }) => `${from}-${to} מתוך ${count !== -1 ? count : `יותר מ${to}`}`,
            labelRowsPerPage: 'שורות בעמוד:',
            labelRowsSelected: (count) => count > 1 ? `${count} שורות נבחרו` : `שורה אחת נבחרה`,
          },
        }}
        editMode="row"
      />
    </Paper>
  );
}
