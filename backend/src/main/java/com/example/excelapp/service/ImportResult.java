package com.example.excelapp.service;

import com.example.excelapp.model.Record;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class ImportResult {
    private List<Record> records;
    private int skipped;
}
