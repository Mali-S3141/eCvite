import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box,Button,Paper,Stack,Typography,TextField,Chip,Menu,MenuItem,IconButton,Popper,Dialog,DialogTitle,DialogContent,DialogContentText,DialogActions,} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { getExcelColumns } from '../services/excelColumnsCache';
import ExcelImport from './ExcelImport';

// מספר בית: ספרות, ואפשר אות אחת בסוף (כמו "12" או "12א")
const HOUSE_NO_PATTERN = /^\d+[a-zA-Zא-ת]?$/;

// שדות מערכת/ביקורת (לא "פרטי אורח") - לא מנוהלים דרך excel_columns, נשארים קבועים בקוד
const systemColumns = [
  { field: 'hashCode', headerName: 'מפתח', flex: 1, minWidth: 90, editable: false },
  { field: 'changed', headerName: 'שונה', flex: 0.6, minWidth: 70, editable: false, type: 'boolean' },
  { field: 'changeDate', headerName: 'תאריך שינוי', flex: 0.8, minWidth: 90, editable: false },
  { field: 'changeBy', headerName: 'שונה ע"י', flex: 0.8, minWidth: 90, editable: false },
  { field: 'createdBy', headerName: 'נוצר ע"י', flex: 0.8, minWidth: 90, editable: false },
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

export default function DataTable({ records, loading, onSave, onAutoSave, onSelectionChange, onDeleteRows, initialSelectedIds, onImport, onOpenPrint }) {
  const [rows, setRows] = useState(records);
  const [selectionModel, setSelectionModel] = useState(initialSelectedIds || []);
  const [sortModel, setSortModel] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [fieldDefs, setFieldDefs] = useState([]);

  const [problemQueue, setProblemQueue] = useState([]); // תורי תאים שצריך לתקן לפני שמירה - {id, field}
  const [pendingProblems, setPendingProblems] = useState([]); // תאים בעייתיים שממתינים להחלטה - לתקן או לשמור בכל זאת
  const [saveAnywayDialogOpen, setSaveAnywayDialogOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { mouseX, mouseY, id, field } - קליק ימני על תא כתובת
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null); // כפתור "יצוא" - תפריט הדפסת מדבקות / הורדת קובץ
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
  // דגל שמסמן שהיציאה מהשדה (blur) הבאה נגרמה ע"י Enter (ולא ע"י לחיצת עכבר על שדה
  // אחר) - נקבע ממש לפני ה-blur() היזום, ונקרא/מתאפס ב-handleFocusOut. רק Enter אמור
  // לגרום לקפיצה האוטומטית לתיקון הבא; לחיצת עכבר על שדה אחר צריכה לתת לערוך אותו
  // בשקט, גם אם זה בטעות פותר תא תיקון קודם
  const blurredViaEnterRef = useRef(false);
  const suppressNextJumpRef = useRef(false);
  const problemQueueRef = useRef(problemQueue);
  useEffect(() => {
    problemQueueRef.current = problemQueue;
  }, [problemQueue]);

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

  // כפתור מחיקה צף שנשאר תמיד באותו קצה קבוע של המסך (לא בתוך עמודה של הטבלה עצמה) -
  // כי ה-DataGrid בגרסה הזו ממקם את התאים שלו בעצמו (position אבסולוטי), וזה מתנגש עם
  // ניסיון להצמיד עמודה רגילה. במקום זה עוקבים אחרי מיקום השורה שבריחוף ומציירים מעליה.
  const [hoveredRow, setHoveredRow] = useState(null); // { id, top, height }

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return undefined;

    const handleMouseOver = (event) => {
      // אם העכבר עבר על כפתור המחיקה הצף עצמו - לא מאפסים, אחרת הוא נעלם ברגע שמנסים ללחוץ עליו
      if (event.target.closest('[data-row-delete-icon]')) return;
      const rowEl = event.target.closest('.MuiDataGrid-row');
      if (!rowEl) {
        setHoveredRow(null);
        return;
      }
      const id = rowEl.getAttribute('data-id');
      const containerRect = container.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      setHoveredRow({ id, top: rowRect.top - containerRect.top, height: rowRect.height });
    };

    const handleMouseLeave = () => setHoveredRow(null);

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);


  // סדר העמודות ומה מוצג כברירת מחדל נקבעים ב-excel_columns (ב-Neon), לא בקוד -
  // נטען פעם אחת (getExcelColumns ממטמנת) ולא בכל טעינה מחדש
    useEffect(() => {
        getExcelColumns()
            .then((data) => {
                console.log("EXCEL COLUMNS:", data);
                setFieldDefs(data);
            })
            .catch((err) => {
                console.log("COLUMN ERROR:", err);
                setFieldDefs([]);
            });
    }, []);
  // ברשומות שמגיעות מהשרת החדש (Recipients) אין יותר שדה id מספרי - המזהה הייחודי
  // האמיתי הוא ה-hashCode (מפתח ראשי של הטבלה בפועל) - ה-DataGrid חייב שדה id ייחודי
  // לכל שורה, אז ממלאים אותו מה-hashCode כשהוא חסר
  useEffect(() => {
    setRows(records.map((r) => ({ ...r, id: r.id ?? r.hashCode })));
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
      // לא קופצים ישר לתיקון - שואלים קודם אם לשמור בכל זאת למרות השדות הבעייתיים
      setPendingProblems(problems);
      setSaveAnywayDialogOpen(true);
      return;
    }
    onSave(rows);
  };

  // "שמור בכל זאת" - מתעלמים מהשדות הבעייתיים ושומרים את הטבלה כמו שהיא
  const handleSaveAnyway = () => {
    setSaveAnywayDialogOpen(false);
    onSave(rows);
  };

  // "לתקן עכשיו" - נכנסים לתהליך הקפיצה האוטומטית לתיקון השדות, כמו שהיה קודם
  const handleFixProblemsNow = () => {
    setSaveAnywayDialogOpen(false);
    // מנקים סינון/מיון כדי שכל השורות יהיו גלויות בסדר קבוע - כדי שאפשר יהיה לקפוץ ביניהן
    setActiveFilters([]);
    setInputValue('');
    setSortModel([]);
    setProblemQueue(pendingProblems);
  };

  const handlePrintLabels = () => {
    setExportMenuAnchor(null);
    if (onOpenPrint) onOpenPrint();
  };

  const handleDownloadExcel = () => {
    setExportMenuAnchor(null);
    apiRef.current.exportDataAsCsv({ utf8WithBom: true });
  };

  const handleAddRow = () => {
    // חלק מה-id-ים הם hashCode (מחרוזת, לא מספר) - מתעלמים מהם בחישוב המספר הבא
    const numericIds = rows.map((row) => Number(row.id)).filter((n) => Number.isFinite(n));
    const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
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

    // גוללים לשורה החדשה (תמיד נוספת בראש הרשימה) - אם המשתמשת גוללה למטה בטבלה
    // לפני שהוסיפה שורה, שלא תצטרך לחפש ידנית איפה היא נוספה
    setTimeout(() => {
      apiRef.current?.scrollToIndexes({ rowIndex: 0, colIndex: 0 });
    }, 0);
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

  // מחיקת שורה בודדת - כפתור הפח שמופיע בריחוף על שורה, בלי צורך לסמן אותה קודם
  const handleDeleteSingleRow = useCallback((id) => {
    const updatedRows = rowsRef.current.filter((row) => String(row.id) !== String(id));
    setRows(updatedRows);
    setSelectionModel((prev) => prev.filter((selectedId) => String(selectedId) !== String(id)));
    onAutoSave(updatedRows);
    if (onDeleteRows) {
      onDeleteRows([id]);
    }
  }, [onAutoSave, onDeleteRows]);

  const handleCloseContextMenu = () => setContextMenu(null);

  // כל התאים בטבלה (חוץ מכתובת/בוליאני) עובדים ישירות על ה-state, בלי להסתמך על
  // "מצב עריכה" של ה-DataGrid (דאבל-קליק להיכנס לעריכה) - זה עוקף לגמרי בעיה שנתקלנו
  // בה שבה כניסה למצב עריכה לא תמיד עבדה בצורה עקבית. כל תא הוא קלט חי תמיד, שמעדכן
  // את השורה מיד עם כל הקשה
  const updateCellValue = useCallback((id, field, value) => {
    const updatedRows = rowsRef.current.map((row) =>
      String(row.id) === String(id) ? { ...row, [field]: value } : row
    );
    setRows(updatedRows);
    onAutoSave(updatedRows);

    // עדכון הצביעה האדומה על "בעל"/"אישה" תלוי בערך של השדה השני באותה שורה
    // (חובה זוגית - ראו isRequiredEmpty), אז כשמקלידים באחד מהם צריך שגם התא השני
    // "יתעורר" ויבדוק את עצמו מיד, בלי לחכות ל-blur - updateRows מודיע ל-DataGrid
    // במפורש על השורה המעודכנת, בניגוד להסתמכות בלבד על שינוי ה-prop rows. בכוונה
    // *לא* מוציאים כאן משהו מתור התיקונים (problemQueue) - זה עדיין קורה רק ב-blur
    // (handleFocusOut), אחרת כל הקשה בודדת הייתה מפעילה את אפקט "הקפיצה לבעיה הבאה"
    // וגונבת את הפוקוס מהשדה תוך כדי שעדיין מקלידים בו
    if (field === 'man' || field === 'woman') {
      const updatedRow = updatedRows.find((row) => String(row.id) === String(id));
      if (updatedRow && apiRef.current?.updateRows) {
        apiRef.current.updateRows([updatedRow]);
      }
    }
  }, [onAutoSave, apiRef]);

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
    const { id, field, value } = params;
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          px: 1,
          '&:hover .move-to-note-icon': { opacity: 1 },
        }}
      >
        <input
          value={value ?? ''}
          onChange={(event) => updateCellValue(id, field, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          // בלי stopPropagation כאן ה-DataGrid תופס את מקש הרווח כקיצור מקלדת שלו
          // (למשל גלילה/בחירה) במקום לתת לו סתם להקליד תו רווח רגיל בתוך השדה.
          // Enter מבצע blur על השדה - זה מפעיל את בדיקת ה-focusout הקיימת, שאם השדה
          // תקין מסירה אותו מתור התיקונים וקופצת אוטומטית לתא הבעייתי הבא
          onKeyDown={(event) => {
            if (event.key === ' ') {
              event.stopPropagation();
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              blurredViaEnterRef.current = true;
              event.currentTarget.blur();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            height: '100%',
            font: 'inherit',
            background: 'transparent',
          }}
        />
        {value && (
          <IconButton
            className="move-to-note-icon"
            size="small"
            tabIndex={-1}
            title="העבר להערת כתובת"
            sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.25, flexShrink: 0 }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              moveValueToAddressNote(id, field);
            }}
          >
            <SwapHorizIcon fontSize="inherit" />
          </IconButton>
        )}
      </Box>
    );
  }, [moveValueToAddressNote, updateCellValue]);

  // תא טקסט חי - קלט חופשי לגמרי תמיד, ואם יש pickListField (עמודות קידומת/סיום/
  // שייך ל) גם חץ קטן לצידו שפותח Menu לבחירה מהערכים הקיימים באותה עמודה. שתי
  // האפשרויות זמינות בו-זמנית. הרשימה מחושבת מ-rowsRef בזמן אמת כשפותחים אותה (לא
  // memo שתלוי ב-rows) - בכוונה, כי memo כזה היה יוצר מערך options חדש בכל הקשה,
  // מה שהיה מכריח את columns כולו להיווצר מחדש וגורם ל-DataGrid לאבד פוקוס מהקלט
  // אחרי כל אות (בדיוק הבאג שנתקלנו בו)
  const renderTextCell = useCallback((pickListField) => {
    const TextCell = (params) => {
      const { id, field, value } = params;
      const [menuOpen, setMenuOpen] = useState(false);
      const [menuOptions, setMenuOptions] = useState([]);
      const [expanded, setExpanded] = useState(false); // "שייך ל" עם כמה ערכים - הוצג במלואו ביוזמת המשתמשת
      const [isFocused, setIsFocused] = useState(false); // האם נמצאים בעריכה בפועל (לא רק "הצצה")
      const boxRef = useRef(null);

      // "שייך ל" יכול להכיל כמה ערכים מופרדים בפסיק (למשל נמען ששייך גם ל"עבודה"
      // וגם ל"שכנים") - כשזה ארוך, מציגים רק את הערך הראשון + תגית "+N", ורק לחיצה
      // על התגית (או כניסה לעריכה) חושפת את הכל. זה ויזואלי בלבד - הערך עצמו בתא
      // (ולכן גם החיפוש, שמסתמך עליו) לא משתנה כלל. "הצצה" (לחיצה על "+N" בלי להיכנס
      // בפועל לעריכה) לא סוגרת את עצמה לבד ב-blur (כי הפוקוס אף פעם לא עבר ל-input) -
      // לכן יש לה תגית "כווץ" נפרדת לחזרה מפורשת, בעוד שיציאה מעריכה אמיתית עדיין
      // מכווצת אוטומטית
      const valueParts = String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const isMultiValue = field === 'belongsTo' && valueParts.length > 1;
      const showCollapsed = isMultiValue && !expanded;
      const showExpandedPeek = isMultiValue && expanded && !isFocused;

      // בכוונה בלי MUI Menu כאן - ל-Menu יש "backdrop" בלתי נראה שמכסה את כל הדף
      // (כדי לזהות קליק-מחוץ-לתפריט) והוא תופס את הקליק השני של דאבל-קליק על אותו
      // input לפני שהוא מגיע אליו בכלל - זה מה ששבר את "בחירת מילה שלמה" בעמודות
      // האלה בלבד. הפתרון: Popper (לא Menu/Popover) - אותו מנוע מיקום חכם מול
      // עוגן (כולל RTL נכון), אבל בלי backdrop ובלי modal - ופורטל אוטומטי ל-body
      // כדי לא להיחתך ע"י overflow:hidden של התא
      const openMenu = () => {
        const values = Array.from(
          new Set(
            rowsRef.current
              .map((row) => row[pickListField])
              .filter((v) => v && String(v).trim())
          )
        );
        setMenuOptions(values);
        setMenuOpen(true);
      };
      const closeMenu = () => setMenuOpen(false);

      // מסננת את הרשימה תוך כדי הקלדה - רק ערכים שמתחילים במה שכבר הוקלד, כדי
      // שאפשר יהיה גם להקליד חופשי וגם לראות מיד אילו ערכים קיימים תואמים
      const typed = String(value ?? '').trim();
      const filteredOptions = typed
        ? menuOptions.filter((option) => option.startsWith(typed))
        : menuOptions;

      return (
        <Box ref={boxRef} sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', px: 1, position: 'relative' }}>
          <input
            value={value ?? ''}
            onChange={(event) => updateCellValue(id, field, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            // בלי stopPropagation כאן ה-DataGrid תופס את מקש הרווח כקיצור מקלדת שלו
            // (למשל גלילה/בחירה) במקום לתת לו סתם להקליד תו רווח רגיל בתוך השדה.
            // Enter מבצע blur על השדה - זה מפעיל את בדיקת ה-focusout הקיימת, שאם השדה
            // תקין מסירה אותו מתור התיקונים וקופצת אוטומטית לתא הבעייתי הבא
            onKeyDown={(event) => {
              if (event.key === ' ') {
                event.stopPropagation();
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                blurredViaEnterRef.current = true;
                event.currentTarget.blur();
              }
            }}
            // לחיצה/כניסה לתא בעמודות הבחירה פותחת את רשימת הערכים הקיימים, בלי צורך
            // ללחוץ בנפרד על חץ - אפשר עדיין להקליד חופשי במקביל. כניסה לעריכה תמיד
            // חושפת את הטקסט המלא (גם אם "שייך ל" מכווץ כרגע), ויציאה ממנה מכווצת שוב
            onFocus={() => {
              setIsFocused(true);
              setExpanded(true);
              if (pickListField) openMenu();
            }}
            onBlur={() => {
              setIsFocused(false);
              setExpanded(false);
              closeMenu();
            }}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              height: '100%',
              font: 'inherit',
              background: 'transparent',
              opacity: showCollapsed ? 0 : 1,
              // בהצצה (showExpandedPeek) יש תגית "כווץ" צפה מעל התא - משאירים לה מקום
              // פנוי מהטקסט כדי שלא תכסה חלק מהתוכן
              paddingInlineEnd: showExpandedPeek ? 40 : 0,
            }}
          />
          {showCollapsed && (
            <Box
              onClick={() => boxRef.current?.querySelector('input')?.focus()}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                gap: 0.5,
                cursor: 'text',
              }}
            >
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {valueParts[0]}
              </Typography>
              <Chip
                size="small"
                label={`+${valueParts.length - 1}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded(true);
                }}
                sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
              />
            </Box>
          )}
          {showExpandedPeek && (
            // בהצצה, הטקסט המלא מוצג ישירות דרך ה-input עצמו (בלי חיתוך/שלוש נקודות) -
            // רק תגית "כווץ" קטנה צפה מעליו בצד, לא מכסה את כל התא כמו במצב המכווץ
            <Chip
              size="small"
              label="כווץ"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(false);
              }}
              sx={{
                position: 'absolute',
                insetInlineEnd: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 20,
                fontSize: '0.7rem',
                bgcolor: '#ffffff',
                boxShadow: 1,
              }}
            />
          )}
          {pickListField && (
            <Popper
              open={menuOpen}
              anchorEl={boxRef.current}
              placement="bottom-start"
              style={{ zIndex: 1300 }}
            >
              <Paper
                elevation={4}
                sx={{ minWidth: boxRef.current?.offsetWidth ?? 120, maxHeight: 220, overflowY: 'auto' }}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <MenuItem
                      key={option}
                      // מונע מהלחיצה על אפשרות "לגזול" פוקוס מה-input לפני שה-onClick
                      // מספיק לרוץ - כך ה-input אף פעם לא מאבד פוקוס בזמן בחירה
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        updateCellValue(id, field, option);
                        closeMenu();
                      }}
                    >
                      {option}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {menuOptions.length ? 'אין ערך קיים שמתחיל כך' : 'אין עדיין ערכים בעמודה הזו'}
                  </MenuItem>
                )}
              </Paper>
            </Popper>
          )}
        </Box>
      );
    };
    // עוטפים ב-JSX (לא מחזירים את הפונקציה עצמה) כדי שריאקט יתייחס לכל תא כרכיב
    // אמיתי עם fiber משלו - הכרחי כי יש כאן hooks (useState/useRef) בפנים. בלעדי זה
    // ריאקט "מבלבל" בין hooks של תאים שונים (בדיוק השגיאה "Rendered more hooks...")
    return (params) => <TextCell {...params} />;
  }, [updateCellValue]);

  // תא בוליאני חי (עמודת "הדפסה") - checkbox רגיל, בלי תלות במצב עריכה בכלל
  const renderBooleanCell = useCallback((params) => {
    const { id, field, value } = params;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => updateCellValue(id, field, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
      </Box>
    );
  }, [updateCellValue]);

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

  // שדות "פרטי אורח" בלבד (לא שדות מערכת/ביקורת כמו נוצר ע"י/שונה ע"י/מפתח) -
  // אלה השדות שהחיפוש המהיר אמור לבדוק, אחרת "מנחם" למשל היה תופס גם שורות
  // שרק "נוצר ע"י" מנחם, בלי שום קשר לתוכן האמיתי של השורה
  const searchableFieldNames = useMemo(
    () => fieldDefs.map((f) => f.technicalName),
    [fieldDefs]
  );

  // לוגיקת תת-הסינון והפילטור המשולב
  const filteredRows = useMemo(() => {
    const currentWord = inputValue.trim().toLowerCase();
    const allWords = [...activeFilters.map(f => f.toLowerCase())];
    if (currentWord) allWords.push(currentWord);

    if (allWords.length === 0) return rows;

    return rows.filter((row) => {
      return allWords.every((word) =>
        searchableFieldNames.some((field) => {
          const value = row[field];
          return value !== null && value !== undefined && String(value).toLowerCase().includes(word);
        })
      );
    });
  }, [rows, activeFilters, inputValue, searchableFieldNames]);

  // ref בנוסף למשתנה עצמו - כדי שאפקט "הקפיצה לתא הבעייתי" (ראו למטה) יוכל לקרוא
  // תמיד את השורות העדכניות ביותר, בלי להיות תלוי ב-filteredRows כ-dependency: אחרת
  // כל הקשה בכל שדה בטבלה (שמשנה rows ולכן filteredRows) הייתה מפעילה מחדש את
  // הקפיצה/פוקוס לבעיה הראשונה בתור - גם כשעורכים משהו אחר לגמרי, לא קשור לתיקונים
  const filteredRowsRef = useRef(filteredRows);
  useEffect(() => {
    filteredRowsRef.current = filteredRows;
  }, [filteredRows]);

  // גוללת אל תא בעייתי נתון וממקדת ישירות ב-input שבתוכו - פונקציה משותפת שנקראת
  // גם כש"תור התיקונים" משתנה מבחוץ (למשל נוצר מחדש בלחיצה על "שמור"), וגם ישירות
  // מ-Enter על שדה כלשהו (ר' handleFocusOut) - שם זה נחוץ גם אם התור עצמו לא השתנה
  // בפועל (Enter על שדה שלא היה בו תיקון בכלל, למשל שדה בשורה חדשה שמוסיפים)
  const jumpToProblem = (target) => {
    if (!target || !apiRef.current) return undefined;
    const rowIndex = filteredRowsRef.current.findIndex((row) => row.id === target.id);
    if (rowIndex === -1) return undefined;
    const colIndex = apiRef.current.getColumnIndex(target.field);
    apiRef.current.scrollToIndexes({ rowIndex, colIndex });
    // 300ms ולא 50 - כדי לוודא שזה קורה אחרי שאנימציית הסגירה של הפופ-אפ ("שמור בכל
    // זאת" / "לתקן עכשיו") מסתיימת לגמרי, אחרת הפופ-אפ "גונב" בחזרה את הפוקוס - מחזירה
    // את מזהה הטיימר כדי שקוראים במסגרת useEffect יוכלו לבטל אותו ב-cleanup אם צריך
    return setTimeout(() => {
      // אם בינתיים המשתמשת כבר הספיקה ללחוץ בעצמה על שדה אחר - לא גונבים ממנה את
      // הפוקוס בחזרה לתא הבעייתי
      const active = document.activeElement;
      if (active && active.tagName === 'INPUT' && active !== document.body) return;
      const input = gridContainerRef.current?.querySelector(
        `[data-id="${target.id}"] [data-field="${target.field}"] input`
      );
      input?.focus();
    }, 300);
  };

 const requiredFields = useMemo(
    () => new Set(fieldDefs.filter((f) => f.isRequired).map((f) => f.technicalName)),
    [fieldDefs]
  );

  // "בעל" ו"אישה" הם לא שני שדות חובה נפרדים - מספיק שאחד מהם מלא. חסר נחשב בעיה
  // רק אם שניהם ריקים יחד. getFieldValue מביא את הערך של השדה השני (בעל/אישה) לפי
  // המקור הזמין בכל מקום שקוראים לזה (row מלא, או apiRef.getCellValue)
  const isRequiredEmpty = (field, value, getFieldValue) => {
    if (field === 'man' || field === 'woman') {
      if (!requiredFields.has('man') && !requiredFields.has('woman')) return false;
      const manVal = field === 'man' ? value : getFieldValue('man');
      const womanVal = field === 'woman' ? value : getFieldValue('woman');
      return !manVal && !womanVal;
    }
    return requiredFields.has(field) && !value;
  };

  // בדיקת מדינה/עיר מול ה-API החיצוני הוסרה - הרשימה שם רק באנגלית, בעוד הנתונים כאן
  // בעברית, כך שכל ערך אמיתי היה נפסל בטעות. נשארה רק בדיקת הפורמט של מספר בית.
  const isValueInvalid = (field, value) => {
    if (!value) return false;
    const text = String(value).trim();
    if (!text) return false;
    if (field === 'houseNo') return !HOUSE_NO_PATTERN.test(text);
    return false;
  };

  // ברמת שורה (editMode="row") השורה כולה נשארת פתוחה לעריכה עד שעוזבים אותה לגמרי -
  // כדי שהצביעה על שדה מסוים תיעלם ברגע שעוזבים אותו (גם עם העכבר, לא רק Enter/Tab),
  // מאזינים ישירות לאירוע focusout הטבעי של הדפדפן (לא תלוי באיך בדיוק עזבו את התא)
  // ובודקים מחדש רק את השדה הספציפי הזה שאיבד פוקוס
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container || problemQueue.length === 0) return undefined;

    const handleFocusOut = (event) => {
      const cellEl = event.target.closest('.MuiDataGrid-cell');
      if (!cellEl) return;
      const field = cellEl.getAttribute('data-field');
      const rowEl = cellEl.closest('.MuiDataGrid-row');
      const id = rowEl ? rowEl.getAttribute('data-id') : null;
      if (!id || !field) return;

      // ה-blur() הזה נגרם ע"י Enter או ע"י משהו אחר (לחיצת עכבר על שדה אחר וכו')?
      // נקרא ומיד מתאפס - שייך רק ל-blur הנוכחי הזה, לא ידלוף להבא
      const wasEnter = blurredViaEnterRef.current;
      blurredViaEnterRef.current = false;

      // ה-DataGrid מעדכן את הערך בפועל רק אחרי שה-focusout מסתיים. הבדיקה קורית
      // רק כשעוזבים את השדה (לא בכל הקשה) - כדי לא לקפוץ לתא הבא באמצע הקלדה,
      // רק אחרי שבאמת סיימו לערוך אותו
      setTimeout(() => {
        const value = apiRef.current.getCellValue(id, field);
        const stillInvalid =
          isRequiredEmpty(field, value, (f) => apiRef.current.getCellValue(id, f)) ||
          isValueInvalid(field, value);
        if (stillInvalid) return;

        // עוזבים שדה מהזוג "בעל"/"אישה" כשהוא כבר לא בעיה (העדכון החי כבר וידא שזה
        // נבדק נכון) - מוציאים מהתור גם את השדה השני מהזוג, לא רק את זה שעזבנו,
        // אחרת הקפיצה הבאה עדיין הייתה מוצאת אותו ומדגישה אותו בטעות
        const prev = problemQueueRef.current;
        const remaining = prev.filter((p) => {
          if (String(p.id) !== String(id)) return true;
          if (p.field === field) return false;
          if ((field === 'man' || field === 'woman') && (p.field === 'man' || p.field === 'woman')) return false;
          return true;
        });

        if (remaining.length !== prev.length) {
          // התור באמת השתנה (תא תוקן) - מעדכנים אותו, ומדכאים את הקפיצה האוטומטית
          // של האפקט למטה: הקפיצה עצמה מטופלת כאן ישירות, רק כשיצאו עם Enter
          suppressNextJumpRef.current = true;
          if (remaining.length === 0 && prev.length > 0) {
            onSave(rowsRef.current);
          }
          setProblemQueue(remaining);
        }

        // Enter תמיד קופץ לתיקון הראשון שנשאר בתור - גם אם השדה שעזבו לא היה בכלל
        // חלק מהתיקונים (למשל שדה בשורה חדשה שמוסיפים תוך כדי שיש תיקונים ממתינים).
        // לחיצת עכבר על שדה אחר לא קופצת בכלל, נותנת לערוך בשקט
        if (wasEnter && remaining.length > 0) {
          jumpToProblem(remaining[0]);
        }
      }, 0);
    };

    container.addEventListener('focusout', handleFocusOut);
    return () => container.removeEventListener('focusout', handleFocusOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemQueue, requiredFields]);

  const orderedFieldDefs = useMemo(
      () =>
          fieldDefs
              .slice()
              .sort((a, b) => (a.defaultOrder ?? 999) - (b.defaultOrder ?? 999)),
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
        const requiredEmpty = isRequiredEmpty(field, value, (f) => row[f]);
        if (requiredEmpty || isValueInvalid(field, value)) {
          problems.push({ id: row.id, field });
        }
      });
    });
    return problems;
  };

  // סיכום קבוע לתחתית המסך - כמה שורות בסה"כ וכמה מהן דורשות תיקון כרגע,
  // לא רק בזמן תהליך הקפיצה האוטומטית אחרי לחיצה על "שמור"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allProblems = useMemo(() => findProblemCells(rows), [rows, requiredFields, orderedFieldNames]);
  const problemRowCount = useMemo(
    () => new Set(allProblems.map((p) => p.id)).size,
    [allProblems]
  );

  const columns = useMemo(() => {
    const dynamicColumns = orderedFieldDefs.map((f) => {
      const isBoolean = f.technicalName === 'print';
      const pickListField = ['prefix', 'suffix', 'belongsTo'].includes(f.technicalName)
        ? f.technicalName
        : null;
      const showRequiredMark =
        f.isRequired ||
        ((f.technicalName === 'man' || f.technicalName === 'woman') &&
          (requiredFields.has('man') || requiredFields.has('woman')));
      return {
        field: f.technicalName,
        headerName: showRequiredMark ? `${f.displayName} *` : f.displayName,
        // flex במקום width קבוע - כל העמודות מתחלקות ברוחב שיש בפועל, כדי שהטבלה
        // תמיד תיכנס בלי גלילה אופקית (בשילוב עם עטיפת שורות במקום חיתוך טקסט)
        flex: isBoolean ? 0.6 : 1,
        minWidth: isBoolean ? 70 : 90,
        // העריכה עצמה מתבצעת דרך קלט חי בתוך renderCell (ראו renderTextCell/
        // renderBooleanCell/renderAddressCell) ולא דרך מצב העריכה של ה-DataGrid -
        // editable נשאר false בכוונה כדי שדאבל-קליק לא ינסה גם לפתוח את עורך ברירת
        // המחדל של הרשת מעל הקלט המותאם אישית שלנו
        editable: false,
        type: isBoolean ? 'boolean' : undefined,
        renderCell: isBoolean
          ? renderBooleanCell
          : ADDRESS_FIELDS.includes(f.technicalName)
          ? renderAddressCell
          : renderTextCell(pickListField),
        sortComparator: isBoolean ? undefined : createTextSortComparator(f.technicalName, secondarySortFields),
      };
    });

    return [...dynamicColumns, ...systemColumns];
  }, [orderedFieldDefs, renderAddressCell, renderBooleanCell, renderTextCell, secondarySortFields, requiredFields]);

  // אותה תיבת בחירה משמשת גם למיון הראשי וגם לתתי-המיון: אם עוד אין מיון ראשי (לא
  // לחצו על החץ בכותרת עמודה), הבחירה הראשונה כאן הופכת להיות המיון הראשי עצמו;
  // מהבחירה השנייה ואילך זה ממשיך כתת-מיון (שובר שוויון), כמו קודם
  const handleAddSortField = (field) => {
    if (!field) return;
    if (sortModel.length === 0) {
      setSortModel([{ field, sort: 'asc' }]);
      return;
    }
    if (field === sortModel[0]?.field || secondarySortFields.includes(field)) return;
    setSecondarySortFields((prev) => [...prev, field]);
  };

  const handleRemovePrimarySort = () => {
    setSortModel([]);
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
  // גוללים אל התא הראשון בתור וממקדים ישירות ב-input שבתוכו (התאים הם קלטים חיים
  // תמיד, לא מסתמכים על מצב עריכה של ה-DataGrid, אז אין צורך "לפתוח" עריכה בכלל)
  useEffect(() => {
    // חייב להתאפס תמיד בכל הרצה של האפקט הזה (גם אם התור יצא ריק לגמרי הפעם) - אחרת
    // אם התור התרוקן בדיוק בפעם שדוכאה קפיצה (למשל לחיצת עכבר, לא Enter), הדגל היה
    // נשאר "תקוע" true ומדכא בטעות גם את הקפיצה הבאה האמיתית (למשל אחרי Enter אמיתי).
    // handleFocusOut כבר מטפל בעצמו בקפיצה (jumpToProblem) כשיוצאים עם Enter - האפקט
    // הזה אחראי רק על המקרה שהתור מתעדכן מבחוץ (בעיקר בלחיצה על "שמור")
    const shouldSuppress = suppressNextJumpRef.current;
    suppressNextJumpRef.current = false;
    if (problemQueue.length === 0 || !apiRef.current || shouldSuppress) return undefined;
    const timer = jumpToProblem(problemQueue[0]);
    return () => clearTimeout(timer);
    // תלוי רק ב-problemQueue בכוונה (לא ב-filteredRows/rows) - אחרת כל הקשה בכל שדה
    // בטבלה (גם בשדה שלא קשור לתיקונים בכלל) הייתה מפעילה מחדש את הקפיצה/פוקוס
    // לתא הבעייתי הראשון, וגונבת פוקוס ממי שרצה לערוך משהו אחר תוך כדי שיש תיקונים
    // ממתינים - עכשיו הקפיצה קורית רק כשתור התיקונים עצמו באמת משתנה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemQueue]);

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        border: 'none',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.75,
          borderBottom: '1px solid #eef0f3',
          background: 'linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a', whiteSpace: 'nowrap' }}>
            ניהול רשימת מוזמנים
          </Typography>

          <TextField
            label="הקלידי ערך ולחצי Enter לנעילת סינון/פילטור..."
            size="small"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            sx={{
              width: 190,
              bgcolor: '#ffffff',
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiInputLabel-root': { fontSize: '0.72rem' },
            }}
          />

          {/* תגיות סינון פעילות + איפוס - ליד תיבת החיפוש עצמה */}
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

          {(activeFilters.length > 0 || inputValue.trim() !== '' || sortModel.length > 0 || secondarySortFields.length > 0) && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleFullReset}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              בטל סינון/מיון
            </Button>
          )}

          {/* תיבת מיון אחת לכול: אם עוד אין מיון ראשי, הבחירה כאן קובעת אותו ישירות -
              בלי צורך ללחוץ קודם על החץ בכותרת של עמודה. ברגע שיש מיון ראשי (מכאן או
              מלחיצה על עמודה), אותה תיבה ממשיכה לשמש לתתי-מיון (שובר שוויון), לפי סדר
              הבחירה, ואפשר להוסיף כמה שרוצים */}
          <TextField
            select
            label={sortModel.length === 0 ? 'מיון' : 'תת-מיון'}
            size="small"
            value=""
            onChange={(e) => handleAddSortField(e.target.value)}
            sx={{
              width: 100,
              bgcolor: '#ffffff',
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiInputLabel-root': { fontSize: '0.72rem' },
            }}
          >
            {orderedFieldDefs
              .filter((f) => f.technicalName !== sortModel[0]?.field && !secondarySortFields.includes(f.technicalName))
              .map((f) => (
                <MenuItem key={f.technicalName} value={f.technicalName}>
                  {f.displayName}
                </MenuItem>
              ))}
          </TextField>

          {sortModel.length > 0 && (() => {
            const def = orderedFieldDefs.find((f) => f.technicalName === sortModel[0].field);
            return (
              <Chip
                label={`מיון: ${def ? def.displayName : sortModel[0].field}`}
                onDelete={handleRemovePrimarySort}
                color="primary"
                variant="outlined"
                size="small"
              />
            );
          })()}

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
        </Box>

        <Stack direction="row" spacing={1}>
          <ExcelImport onImport={onImport} />

          <Button
            variant="outlined"
            size="small"
            onClick={(event) => setExportMenuAnchor(event.currentTarget)}
            endIcon={<ArrowDropDownIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            יצוא
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleAddRow}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              bgcolor: '#60a5fa',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#3b82f6', boxShadow: '0 6px 16px rgba(96, 165, 250, 0.35)' },
            }}
          >
            הוסף שורה
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveClick}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              bgcolor: '#60a5fa',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#3b82f6', boxShadow: '0 6px 16px rgba(96, 165, 250, 0.35)' },
            }}
          >
            שמור את כל המוזמנים
          </Button>
        </Stack>
      </Box>

   <Box ref={gridContainerRef} sx={{ px: 1.5, pb: 1, pt: 0.75, maxWidth: '100%', position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

   <DataGrid
        apiRef={apiRef}
        rows={filteredRows}
        getRowId={(row) => row.hashCode ?? row.id}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableRowSelectionOnClick
        getCellClassName={(params) => {
          // צביעה בכלל לא קורית לפני שהיה ניסיון שמירה שנחסם - שורה חדשה/ריקה לא נצבעת
          // מיד, רק אחרי שלוחצים "שמור את כל המוזמנים" ונמצאות בעיות בפועל
          if (problemQueue.length === 0) return '';

          // התא הספציפי שקפצנו אליו כרגע (הראשון בתור התיקונים) - מודגש הרבה יותר חזק
          // מכל שאר תאי הבעיה, כדי שיהיה ברור בבירור לאיפה קפצו
          if (
            String(params.id) === String(problemQueue[0].id) &&
            params.field === problemQueue[0].field
          ) {
            return 'current-problem-cell';
          }
          if (isRequiredEmpty(params.field, params.value, (f) => params.row[f])) return 'required-empty-cell';
          if (isValueInvalid(params.field, params.value)) return 'invalid-value-cell';
          return '';
        }}
        sx={{
          border: 'none',
          borderRadius: 2,
          flex: 1,
          minHeight: 0,
          fontSize: '0.875rem',
          fontFamily: '"Rubik", "Segoe UI", Arial, sans-serif',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
            color: '#4b5563',
            fontFamily: '"Rubik", "Segoe UI", Arial, sans-serif',
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
            backgroundColor: '#fdecea !important',
            outline: '1.5px solid #e57373',
            outlineOffset: '-1.5px',
            borderRadius: '6px',
          },
          '& .invalid-value-cell': {
            backgroundColor: '#fef3e2 !important',
            outline: '1.5px solid #f0a860',
            outlineOffset: '-1.5px',
            borderRadius: '6px',
          },
          '& .current-problem-cell': {
            backgroundColor: '#ffe4e8 !important',
            outline: '2px solid #e11d48',
            outlineOffset: '-2px',
            borderRadius: '7px',
            fontWeight: 700,
            animation: 'current-problem-pulse 1.4s ease-in-out infinite',
          },
          '@keyframes current-problem-pulse': {
            '0%, 100%': { boxShadow: '0 0 0 4px rgba(225, 29, 72, 0.30)' },
            '50%': { boxShadow: '0 0 0 9px rgba(225, 29, 72, 0.06)' },
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
      {hoveredRow && (
        <IconButton
          data-row-delete-icon="true"
          size="small"
          title="מחק שורה"
          onClick={() => handleDeleteSingleRow(hoveredRow.id)}
          sx={{
            position: 'absolute',
            top: hoveredRow.top + hoveredRow.height / 2 - 16,
            // 4 מספיק כשאין פס גלילה באזור הזה - עכשיו שהטבלה גוללת בתוך עצמה יש שם
            // גם פס גלילה אנכי, וצריך מרווח גדול יותר כדי שהאייקון לא יתנגש איתו
            insetInlineEnd: 22,
            zIndex: 5,
            bgcolor: 'transparent',
            boxShadow: 'none',
            '&:hover': { bgcolor: 'transparent' },
            '&:hover .row-delete-icon-svg': { color: '#ef4444' },
          }}
        >
          <DeleteOutlineIcon className="row-delete-icon-svg" fontSize="small" sx={{ color: '#94a3b8', transition: 'color 0.15s' }} />
        </IconButton>
      )}
   </Box>

      <Menu
        open={exportMenuAnchor !== null}
        anchorEl={exportMenuAnchor}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={handlePrintLabels}>הדפסת מדבקות</MenuItem>
        <MenuItem onClick={handleDownloadExcel}>הורדת קובץ אקסל למחשב</MenuItem>
      </Menu>

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleMoveToAddressNote}>העבר להערת כתובת</MenuItem>
      </Menu>

      {/* disableRestoreFocus - בלי זה ה-Dialog "מחזיר" את הפוקוס לכפתור השמירה אחרי
          שהוא נסגר, וזה מתנגש עם הקפיצה האוטומטית לתא הבעייתי שקורית באותו רגע בדיוק */}
      <Dialog open={saveAnywayDialogOpen} onClose={handleFixProblemsNow} disableRestoreFocus>
        <DialogTitle>יש שדות שגויים או חסרים</DialogTitle>
        <DialogContent>
          <DialogContentText>
            נמצאו {pendingProblems.length} שדות שדורשים תיקון (חובה שריקים או ערכים לא תקינים).
            אפשר לתקן אותם עכשיו, או לשמור בכל זאת כמו שהטבלה נמצאת עכשיו.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFixProblemsNow} color="primary">
            לתקן עכשיו
          </Button>
          <Button onClick={handleSaveAnyway} color="error" variant="contained">
            שמור בכל זאת
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>

      {/* שורת בחירה - צפה מעל הכותרת, לא דוחפת את הטבלה למטה כשהיא נפתחת/נסגרת */}
      {selectionModel.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            bgcolor: '#ffffff',
            borderRadius: 999,
            border: '1px solid #e6e8ec',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          }}
        >
          <IconButton size="small" onClick={() => { setSelectionModel([]); onSelectionChange([]); }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            {selectionModel.length} נבחרו
          </Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeleteRows}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            מחק שורות
          </Button>
        </Box>
      )}

      {/* סיכום קטן ומוצמד לתחתית המסך - נשאר גלוי כל הזמן, גם כשגוללים בטבלה */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 2,
          px: 2.5,
          py: 0.75,
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          fontSize: '0.75rem',
          boxShadow: '0 -2px 8px rgba(15, 23, 42, 0.05)',
        }}
      >
        {problemQueue.length > 0 && (
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 600, color: '#b45309' }}>
            מתקנים כעת - קופצים אוטומטית לשדה הבא עד שהכל יתוקן...
          </Typography>
        )}
        <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 600, color: '#334155' }}>
          סה"כ מוזמנים: {rows.length}
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: 'inherit', fontWeight: 600, color: problemRowCount > 0 ? '#b45309' : '#15803d' }}
        >
          {problemRowCount > 0 ? `דרושים תיקון: ${problemRowCount} שורות` : 'הכל תקין ✓'}
        </Typography>
      </Box>
    </Box>
  );
}



