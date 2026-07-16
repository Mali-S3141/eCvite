package com.example.excelapp.repository;

import com.example.excelapp.model.ExcelColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExcelColumnRepository
        extends JpaRepository<ExcelColumn, Long> {

    List<ExcelColumn> findAllByOrderByDefaultOrderAsc();
}
