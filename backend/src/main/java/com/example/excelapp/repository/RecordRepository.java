package com.example.excelapp.repository;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
    List<Record> findByUserOrderByIdAsc(User user);

    @Query("select r.hashCode from Record r where r.hashCode in :hashes")
    List<String> findExistingHashCodes(@Param("hashes") Collection<String> hashes);

    // שאילתה גולמית (לא דרך ה-entity) כדי לקבל את ה-hash_code העדכני שהטריגר יצר -
    // פנייה אחת בשביל כל הרשומות ביחד, במקום refresh נפרד לכל רשומה
    @Query(value = "SELECT id, hash_code FROM recipients WHERE id IN :ids", nativeQuery = true)
    List<Object[]> findHashCodesByIds(@Param("ids") Collection<Long> ids);
}
