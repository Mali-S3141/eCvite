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
        editMode="row"
      />
    </Paper>
  );
}
