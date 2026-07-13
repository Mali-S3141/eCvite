package com.example.excelapp.repository;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
    List<Record> findByUser(User user);

    @Query("select r.hashCode from Record r where r.hashCode in :hashes")
    List<String> findExistingHashCodes(@Param("hashes") Collection<String> hashes);
}
