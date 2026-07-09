package com.example.excelapp.repository;

import com.example.excelapp.entity.recipients;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface recipientsRepository extends JpaRepository<recipients, String> {
    // הוספת extends JpaRepository נותנת לנו את ה-findAll אוטומטית!
    // השתמשנו ב-String כי ה-Id (המפתח) של הנתונים הוא ה-hashCode שהוא טקסט
}
