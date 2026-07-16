package com.example.excelapp.repository;

import com.example.excelapp.entity.Recipients;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecipientsRepository extends JpaRepository<Recipients, String> {
    // הוספת extends JpaRepository נותנת לנו את ה-findAll אוטומטית!
    // השתמשנו ב-String כי ה-Id (המפתח) של הנתונים הוא ה-hashCode שהוא טקסט
    Optional<Recipients> findByHashCode(String hashCode);
}
