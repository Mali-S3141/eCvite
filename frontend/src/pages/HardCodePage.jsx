// src/pages/HardCodePage.jsx
import React from 'react';

// 🌟 הקבועים החדשים של ה-PrintModal שהוצאנו מה-Hard Code:
export const MODAL_TEXTS = {
  STEP_1_TITLE: "על מה תרצה להדפיס?",
  LABEL_OPTION: "מדבקות",
  ENVELOPES_OPTION: "מעטפות",
  LISTS_OPTION: "רשימות",
  
  STEP_2_TITLE: "הגדרות הדפסה (מדבקות)",
  SIZE_INPUT_LABEL: "בחירת גודל מדבקה",
  PRINTER_INPUT_LABEL: "בחירת מדפסת",
  
  SIZE_SMALL: "קטן",
  SIZE_MEDIUM: "בינוני",
  SIZE_LARGE: "גדול",
  
  PRINTER_MAIN: "מדפסת מחסן ראשית",
  PRINTER_BACK: "מדפסת משרד אחורי",
  
  BUTTON_CANCEL: "ביטול",
  BUTTON_NEXT: "המשך",
  BUTTON_BACK: "חזור",
  BUTTON_PREVIEW: "תצוגה מקדימה",
  BUTTON_PRINT: "הדפס",
  
  NOT_AVAILABLE_ALERT: (type) => `הדפסת ${type === 'envelopes' ? 'מעטפות' : 'רשימות'} אינה זמינה כרגע.`
};

// הקבועים הקודמים ששמרנו (נשארים פה כרגיל)
export const PRINT_CONSTANTS = {
  PREVIEW_TITLE: "תצוגה מקדימה של המדבקות",
  HONORIFIC: "לכבוד הרב",
};

export default function HardCodePage() {
  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      <h3>עמוד מרכז קבועים וטקסטים</h3>
    </div>
  );
}