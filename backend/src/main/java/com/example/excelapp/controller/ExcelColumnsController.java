package com.example.excelapp.controller;

import com.example.excelapp.model.ExcelColumn;
import com.example.excelapp.repository.ExcelColumnRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
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
}
