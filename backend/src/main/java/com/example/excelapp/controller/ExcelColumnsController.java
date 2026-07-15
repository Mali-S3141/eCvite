package com.example.excelapp.controller;

import com.example.excelapp.model.ExcelColumn;
import com.example.excelapp.repository.ExcelColumnRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// מחזיר את כל הגדרות עמודות ה-Excel בבת אחת - הפרונט קורא לזה פעם אחת ושומר בזיכרון,
// כדי שלא יהיה צורך לחזור ולפנות ל-DB בכל שלב של תהליך ההתאמה/ייבוא
@RestController
@RequestMapping("/api/excel-columns")
@CrossOrigin(origins = "http://localhost:3000")
public class ExcelColumnsController {
    private final ExcelColumnRepository excelColumnRepository;

    public ExcelColumnsController(ExcelColumnRepository excelColumnRepository) {
        this.excelColumnRepository = excelColumnRepository;
    }

    @GetMapping
    public List<ExcelColumn> getColumns() {
        return excelColumnRepository.findAll().stream()
                .sorted(Comparator.comparing(
                        c -> c.getDefaultOrder() != null ? c.getDefaultOrder() : Integer.MAX_VALUE))
                .collect(Collectors.toList());
    }

    // מוסיף כותרת של עמודה מקובץ Excel כ"כינוי" חדש לשדה שהמשתמשת בחרה ידנית במסך ההתאמה -
    // כדי שבפעם הבאה שאותה כותרת תופיע בקובץ, היא תזוהה אוטומטית בלי לשאול שוב
    @PostMapping("/{technicalName}/aliases")
    public ExcelColumn addAlias(@PathVariable String technicalName, @RequestBody Map<String, String> body) {
        String newAlias = body.get("alias");
        ExcelColumn column = excelColumnRepository.findAll().stream()
                .filter(c -> c.getTechnicalName().equals(technicalName))
                .findFirst()
                .orElseThrow();

        List<String> existing = Arrays.stream(
                        (column.getAliases() == null ? "" : column.getAliases()).split(","))
                .map(String::trim)
                .collect(Collectors.toList());

        if (newAlias != null && !newAlias.isBlank() && !existing.contains(newAlias.trim())) {
            String updated = column.getAliases() == null || column.getAliases().isBlank()
                    ? newAlias.trim()
                    : column.getAliases() + "," + newAlias.trim();
            column.setAliases(updated);
            excelColumnRepository.save(column);
        }
        return column;
    }
}
