// src/pages/PrintPreviewPage.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material';

function getDisplayName(row) {
  if (row.display) return row.display;
  return [row.man, row.woman ? `ו${row.woman}` : '', row.lastName].filter(Boolean).join(' ');
}

export default function PrintPreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // חילוץ הנתונים עם תמיכה מלאה גם ב-selectedRows וגם ב-selectedItems של ראש הצוות
const { selectedRows = [], selectedItems = [], labelSize = 'medium', printer = '' } = location.state || {};  
  // 🧪 נתוני בדיקה זמניים כדי שתוכלי לעצב ולראות את המדבקות עכשיו!
  const mockRows = [
    { id: 1, prefix: 'הרב', man: 'ישראל', woman: '', lastName: 'ישראלי', city: 'בני ברק', street: 'רבי עקיבא', houseNo: '45' },
    { id: 2, prefix: '', man: 'אלחנן', woman: '', lastName: 'כהן', city: 'ירושלים', street: 'יפו', houseNo: '12' },
    { id: 3, prefix: '', man: 'אברהם', woman: '', lastName: 'לוי', city: 'בני ברק', street: 'חזון איש', houseNo: '8' }
  ];

  // קביעת הרשומות להצגה לפי מה שהתקבל (או שימוש במוק)
  const actualRows = selectedRows.length > 0 ? selectedRows : selectedItems;
  const rowsToDisplay = actualRows.length > 0 ? actualRows : mockRows;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#f8f9fa' }}>
        
        {/* סרגל עליון עם כל הכפתורים */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} borderBottom="1px solid #e0e0e0" pb={2} gap={2}>
          <Typography variant="h5" fontWeight="bold">תצוגה מקדימה</Typography>
          
          <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            color="primary" 
           onClick={() => {
              //  שומרים את כל המצב הנוכחי בזיכרון לפני שחוזרים
               sessionStorage.setItem('fromPreview', 'true'); 
               sessionStorage.setItem('savedLabelSize', labelSize);
               sessionStorage.setItem('savedPrinter', printer);
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

        {/* אזור המדבקות */}
        {/* אזור המדבקות - מסודר בשורות עם ירידת שורה אוטומטית */}
<Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" justifyContent="center">
          {rowsToDisplay.length === 0 ? (
            <Typography color="error">לא נבחרו שורות להדפסה. חזרי לטבלה וסמני רשומות.</Typography>
          ) : (
            rowsToDisplay.map((row, index) => ( 
              <Box 
                key={row.id || index} 
                className={`preview-label ${labelSize}`} 
                sx={{ 
                  // גדלים דינמיים לפי בחירת הגודל במודאל
                  width: labelSize === 'small' ? '320px' : labelSize === 'large' ? '600px' : '450px',
                  minHeight: labelSize === 'small' ? '120px' : labelSize === 'large' ? '240px' : '180px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  p: labelSize === 'small' ? 2 : 3, 
                  mb: 1, 
                  border: '2px solid #000000', 
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  pageBreakInside: 'avoid'
                }}
              >
                {/* שורת השם המכובדת */}
                <Typography
                  variant={labelSize === 'small' ? 'body1' : labelSize === 'large' ? 'h4' : 'h5'}
                  sx={{ fontWeight: 'bold', mb: 1, color: '#000000', textAlign: 'center' }}
                >
                  לכבוד {row.prefix || 'הרב'} {getDisplayName(row)} {row.suffix || ''}
                </Typography>

                {/* שורת הכתובת */}
                <Typography
                  variant={labelSize === 'small' ? 'caption' : labelSize === 'large' ? 'h5' : 'h6'}
                  sx={{ color: '#333333', textAlign: 'center' }}
                >
                  {row.street} {row.houseNo}, {row.city} {row.country || ''}
                </Typography>
              </Box>
            ))
          )}
        </Stack>
      </Paper>
    </Container>
  );
}