// מקור אמת יחיד לגדלי המדבקות ולחישוב כמה מדבקות נכנסות בשורה -
// גם המודאל (תצוגה ממוזערת) וגם דף ההדפסה בפועל משתמשים באותם המספרים,
// כדי שמה שרואים בבחירה יתאים בדיוק למה שנראה בהדפסה.

// המרה ממ"ס לפיקסלים לפי 96dpi (התקן הרגיל של דפדפנים, גם בהדפסה) - 1 ס"מ = 37.795 פיקסל
// בלי לעגל כלפי מעלה - 3 מדבקות של 7 ס"מ = בדיוק 21 ס"מ = כל רוחב עמוד A4, בלי מקום לטעות
const CM_TO_PX = 37.795;
const cmToPx = (cm) => cm * CM_TO_PX;

// גדלי מדבקה ריאליים (בפיקסלים, לתצוגה על מסך/הדפסה מהדפדפן)
// "סטנדרטי" = 7X2.3 ס"מ, גיליון המדבקות שבשימוש בפועל (יוצא 3X11 בעמוד, בלי שוליים/רווח בין העמודות)
export const REAL_LABEL_SIZES = {
  standard: { width: cmToPx(7), height: cmToPx(2.3) },
  large: { width: 400, height: 190 },
};

// רוחב עמוד A4 המלא (21 ס"מ) - למדבקת ה"סטנדרטי" צריך שוליים=0 ורווח=0 כדי ש-3 בדיוק ייכנסו
export const REAL_PAGE_CONTENT_WIDTH = cmToPx(21);
export const REAL_GAP_PX = 0;

export function getColumns(pageContentWidth, labelWidth, gapPx) {
  return Math.max(1, Math.floor((pageContentWidth + gapPx) / (labelWidth + gapPx)));
}

export function getRealColumns(sizeKey) {
  const size = REAL_LABEL_SIZES[sizeKey] || REAL_LABEL_SIZES.standard;
  return getColumns(REAL_PAGE_CONTENT_WIDTH, size.width, REAL_GAP_PX);
}

// מחזיר גרסה ממוזערת (בקנה מידה קטן) של אותם הגדלים בדיוק, לשימוש בתצוגה מקדימה קטנה (כמו במודאל) -
// מספר העמודות שייצא מהחישוב עליה זהה תמיד למספר העמודות בעמוד האמיתי, כי זה אותו יחס בדיוק.
export function getScaledLabelSizes(targetContentWidth) {
  const scale = targetContentWidth / REAL_PAGE_CONTENT_WIDTH;
  const gap = REAL_GAP_PX * scale;
  const sizes = Object.fromEntries(
    Object.entries(REAL_LABEL_SIZES).map(([key, { width, height }]) => [
      key,
      { width: width * scale, height: height * scale },
    ])
  );
  return { scale, gap, sizes };
}
