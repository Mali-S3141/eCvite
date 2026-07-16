package com.example.excelapp.controller;

import com.example.excelapp.model.ExcelColumn;
import com.example.excelapp.repository.ExcelColumnRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipient-columns")
@CrossOrigin(origins = "http://localhost:3000")
public class ExcelColumnController {

    private final ExcelColumnRepository excelColumnRepository;

    public ExcelColumnController(ExcelColumnRepository excelColumnRepository) {
        this.excelColumnRepository = excelColumnRepository;
    }

    @GetMapping
    public ResponseEntity<List<ExcelColumn>> getColumns() {
        return ResponseEntity.ok(excelColumnRepository.findAll());
    }
}