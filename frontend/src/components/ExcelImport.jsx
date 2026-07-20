import { useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';

import { getExcelColumns, invalidateExcelColumnsCache } from '../services/excelColumnsCache';
import { matchExcelHeaders, matchByValues, remapRows } from '../utils/excelColumnMatcher';
import ColumnMatchDialog, { IGNORE_VALUE } from './ColumnMatchDialog';

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

function applyDefaultCountry(rows) {
  return rows.map((row) =>
      String(row.country ?? '').trim()
          ? row
          : { ...row, country: 'ישראל' }
  );
}

export default function ExcelImport({ onImport, onOpenPrint }) {

  const [fileName, setFileName] = useState('');
  const [matchError, setMatchError] = useState('');
  const [pending, setPending] = useState(null);
  const [columns, setColumns] = useState([]);

  const handleFile = async (event) => {

    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMatchError('');


    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);


    const sheetsData = workbook.SheetNames.map((name) => {

      const sheet = workbook.Sheets[name];

      return {
        json: XLSX.utils.sheet_to_json(sheet, { defval: '' }),
        trueOrder: getTrueHeaderOrder(sheet),
      };

    }).filter((s) => s.json.length > 0);


    const json = sheetsData.flatMap((s) => s.json);


    if (json.length === 0) {

      onImport({
        rows: [],
        columns: []
      });

      return;
    }


    try {

      const loadedColumns = await getExcelColumns();
      setColumns(loadedColumns);


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


      const { matched, unmatched } =
          matchExcelHeaders(headers, loadedColumns);

      const { matched: matchedByValues, unmatched: stillUnmatched } =
          matchByValues(unmatched, json, loadedColumns);

      Object.assign(matched, matchedByValues);


      const unmatchedWithData = stillUnmatched.filter((header) =>
          json.some(
              (row) => String(row[header] ?? '').trim() !== ''
          )
      );


      if (unmatchedWithData.length > 0) {

        setPending({
          json,
          matched,
          unmatchedHeaders: unmatchedWithData,
          columns: loadedColumns
        });

        return;
      }

      const mappedRows = applyDefaultCountry(
          remapRows(json, matched)
      );

      console.log("שורות אחרי מיפוי:", mappedRows);
      console.log("התאמת עמודות:", matched);

      onImport({
        rows: mappedRows,
        columns: loadedColumns
      });
      onImport({
        rows: applyDefaultCountry(remapRows(json, matched)),
        columns: loadedColumns.filter(c => c.technicalName)
      });


    } catch (err) {

      console.error(
          'לא ניתן היה לטעון את הגדרות השדות מהשרת:',
          err
      );


      setMatchError(
          'לא ניתן היה להתאים עמודות אוטומטית'
      );


      onImport({
        rows: applyDefaultCountry(json),
        columns: await getExcelColumns()
      });
    }
  };



  const handleDialogConfirm = async (choices) => {

    const {
      json,
      matched,
      unmatchedHeaders,
      columns
    } = pending;


    setPending(null);


    const finalMatched = { ...matched };
    const aliasesToSave = [];


    unmatchedHeaders.forEach((header) => {

      const technicalName = choices[header];


      if (
          technicalName &&
          technicalName !== IGNORE_VALUE
      ) {

        finalMatched[header] = technicalName;

        aliasesToSave.push({
          header,
          technicalName
        });

      }

    });



    if (aliasesToSave.length > 0) {
      console.log(
          "כינויים חדשים שנבחרו:",
          aliasesToSave
      );

      invalidateExcelColumnsCache();
    }


    onImport({
      rows: applyDefaultCountry(
          remapRows(json, finalMatched)
      ),
      columns
    });

  };



  const handleDialogCancel = () => {

    const {
      json,
      matched,
      columns
    } = pending;


    setPending(null);


    onImport({
      rows: applyDefaultCountry(
          remapRows(json, matched)
      ),
      columns
    });

  };



  return (

      <Box display="flex" alignItems="center" gap={2}>

        <Button variant="contained" component="label">

          ייבוא Excel

          <input
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
          />

        </Button>


        <Button
            variant="outlined"
            onClick={onOpenPrint}
        >
          הדפסה
        </Button>


        {fileName &&
            <Typography>
              {fileName}
            </Typography>
        }


        {matchError &&
            <Typography color="error">
              {matchError}
            </Typography>
        }


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