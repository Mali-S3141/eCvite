// נרמול שמות עמודות + מנגנון מילון התאמות (התאמה מדויקת בלבד בשלב הזה)

function normalize(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getAliasList(column) {
  return String(column.aliases ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

// מתאימה כותרות עמודות מקובץ Excel לעמודות הידועות (columns מגיעות מ-excel_columns ב-DB, נטענות פעם אחת)
export function matchExcelHeaders(headers, columns) {
  const matched = {}; // כותרת מקורית בקובץ -> technical_name של העמודה שלנו
  const unmatched = [];

  headers.forEach((header) => {
    const normalized = normalize(header);

    let column = columns.find(
      (c) => normalize(c.technicalName) === normalized || normalize(c.displayName) === normalized
    );

    if (!column) {
      column = columns.find((c) => getAliasList(c).some((alias) => normalize(alias) === normalized));
    }

    if (column) {
      matched[header] = column.technicalName;
    } else {
      unmatched.push(header);
    }
  });

  return { matched, unmatched };
}

// ממפה מחדש את השורות מהקובץ לפי מפת "כותרת מקורית -> שם טכני שלנו"
export function remapRows(rows, headerToKeyMap) {
  return rows.map((row) => {
    const newRow = {};
    Object.entries(row).forEach(([header, value]) => {
      const key = headerToKeyMap[header];
      if (key) {
        newRow[key] = value;
      }
    });
    return newRow;
  });
}
