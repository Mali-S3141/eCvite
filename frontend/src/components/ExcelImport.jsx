import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';

export default function ExcelImport({ onImport }) {
  const [fileName, setFileName] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    onImport(json);
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Button variant="contained" component="label">
        ייבוא Excel
        <input hidden type="file" accept=".xlsx,.xls" onChange={handleFile} />
      </Button>
      {fileName && <Typography>{fileName}</Typography>}
    </Box>
  );
}
