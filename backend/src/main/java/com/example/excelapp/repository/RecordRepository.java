package com.example.excelapp.repository;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
    List<Record> findByUser(User user);
}
