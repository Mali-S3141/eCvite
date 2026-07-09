import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

// Cache שגורם לכל ה-CSS של MUI (כולל DataGrid) להיבנות בהתאמה ל-RTL,
// כך שגם החישובים הפנימיים של גלילה יסתנכרנו נכון עם הכיוון של הדף.
export const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});
