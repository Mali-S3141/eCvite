import api from './api';

// שומר את תוצאת הקריאה הראשונה בזיכרון (לכל משך חיי הטאב) -
// כל קריאה נוספת ל-getExcelColumns() מקבלת את אותה תוצאה בלי לפנות שוב ל-DB
let cachedColumnsPromise = null;

export function getExcelColumns() {
  if (!cachedColumnsPromise) {
    cachedColumnsPromise = api.getExcelColumns().then((res) => res.data);
  }
  return cachedColumnsPromise;
}

// קוראים לזה אחרי ששומרים כינוי חדש (במסך ההתאמה הידנית), כדי שהקריאה הבאה
// תביא את הרשימה המעודכנת מה-DB במקום להמשיך להשתמש בעותק הישן שבזיכרון
export function invalidateExcelColumnsCache() {
  cachedColumnsPromise = null;
}
