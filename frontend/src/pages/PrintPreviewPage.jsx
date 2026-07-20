// src/pages/PrintPreviewPage.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material';
import { REAL_LABEL_SIZES, getRealColumns } from '../utils/labelSheetLayout';

function getDisplayName(row) {
  if (row.display) return row.display;
  return [row.man, row.woman ? `ו${row.woman}` : '', row.lastName].filter(Boolean).join(' ');
}

// פריסת רשת אמיתית לדף מדבקות - הגדלים ומספר העמודות מגיעים מאותו מקור אמת
// שמשמש גם את התצוגה הממוזערת במודאל, כדי ששניהם תמיד יתאימו
const LABEL_LAYOUT = {
  // המדבקה גבוהה רק 2.3 ס"מ בפועל - כתב גדול (h5/h6) לא נכנס בכלל, לכן כתב קטן ודחוס
  standard: { ...REAL_LABEL_SIZES.standard, columns: getRealColumns('standard'), nameVariant: 'body2', addrVariant: 'caption' },
  large: { ...REAL_LABEL_SIZES.large, columns: getRealColumns('large'), nameVariant: 'h4', addrVariant: 'h5' },
};

export default function PrintPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // חילוץ הנתונים עם תמיכה מלאה גם ב-selectedRows וגם ב-selectedItems של ראש הצוות
const { selectedRows = [], selectedItems = [], labelSize = 'standard', printer = '', fontType = 'Arial, sans-serif', deliveryMethod = 'courier', autoPrint = false } = location.state || {};

  // קביעת הרשומות להצגה לפי מה שהתקבל
  const actualRows = selectedRows.length > 0 ? selectedRows : selectedItems;
  const rowsToDisplay = actualRows;
  const layout = LABEL_LAYOUT[labelSize] || LABEL_LAYOUT.standard;

  // כשמגיעים ישר מכפתור "הדפס" (לא מ"תצוגה מקדימה") - פותחים את חלון ההדפסה
  // של הדפדפן מיד, בלי לחכות שילחצו שוב על "הדפס מדבקות" כאן
  useEffect(() => {
    if (autoPrint && rowsToDisplay.length > 0) {
      window.print();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4, '@media print': { m: 0, maxWidth: 'none', p: 0 } }}>
      <style>{`@media print { @page { margin: 0; } }`}</style>
      <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: '#f8f9fa',
          '@media print': { p: 0, boxShadow: 'none', bgcolor: 'transparent', borderRadius: 0 },
        }}
      >

        {/* סרגל עליון עם כל הכפתורים - מוסתר לגמרי בהדפסה, מוצג רק על המסך */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
          borderBottom="1px solid #e0e0e0"
          pb={2}
          gap={2}
          sx={{ '@media print': { display: 'none' } }}
        >
          <Typography variant="h5" fontWeight="bold">תצוגה מקדימה</Typography>
          
          <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            color="primary" 
           onClick={() => {
              //  שומרים את כל המצב הנוכחי בזיכרון לפני שחוזרים, כולל אילו שורות היו מסומנות
               sessionStorage.setItem('fromPreview', 'true');
               sessionStorage.setItem('savedLabelSize', labelSize);
               sessionStorage.setItem('savedPrinter', printer);
               sessionStorage.setItem('savedFontType', fontType);
               sessionStorage.setItem('savedDeliveryMethod', deliveryMethod);
               sessionStorage.setItem('savedSelectedIds', JSON.stringify(rowsToDisplay.map((r) => r.id)));
                navigate('/dashboard');
            }} 
>
              שינוי הגדרות הדפסה
         </Button>

            <Button 
              variant="contained" 
              color="success" 
              onClick={() => window.print()} 
              sx={{ fontWeight: 'bold' }}
            >
              הדפס מדבקות
            </Button>

            <Button variant="text" onClick={() => navigate('/dashboard')}>
              ביטול וחזרה
            </Button>
          </Stack>
        </Box>

        {/* אזור המדבקות - רשת אמיתית של מדבקות, בדיוק כמו שדף המדבקות המודפס ייראה */}
        {rowsToDisplay.length === 0 ? (
          <Typography color="error">לא נבחרו שורות להדפסה. חזרי לטבלה וסמני רשומות.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`,
              justifyContent: 'center',
              // בלי רווח אופקי בין העמודות - 3 מדבקות של 7 ס"מ תופסות בדיוק את כל רוחב הדף,
              // אין מקום לרווח. רווח אנכי קטן בין השורות עדיין נשאר, לנוחות קריאה
              columnGap: 0,
              rowGap: 1,
            }}
          >
            {rowsToDisplay.map((row, index) => (
              <Box
                key={row.id || index}
                sx={{
                  boxSizing: 'border-box',
                  width: layout.width,
                  height: layout.height,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  p: 0.5,
                  backgroundColor: '#ffffff',
                  pageBreakInside: 'avoid',
                  fontFamily: fontType,
                }}
              >
                {/* שורת השם המכובדת */}
                <Typography
                  variant={layout.nameVariant}
                  sx={{ fontWeight: 'bold', mb: 0.25, color: '#000000', textAlign: 'center', fontFamily: 'inherit', lineHeight: 1.2 }}
                >
                  לכבוד {row.prefix || ''} {getDisplayName(row)} {row.suffix || ''}
                </Typography>

                {/* שורת הרחוב */}
                <Typography
                  variant={layout.addrVariant}
                  sx={{ color: '#333333', textAlign: 'center', fontFamily: 'inherit', lineHeight: 1.2 }}
                >
                  {row.street} {row.houseNo}
                </Typography>

                {/* שורת עיר וארץ - מתחת לרחוב */}
                <Typography
                  variant={layout.addrVariant}
                  sx={{ color: '#333333', textAlign: 'center', fontFamily: 'inherit', lineHeight: 1.2 }}
                >
                  {row.city} {row.country || ''}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}