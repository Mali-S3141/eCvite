package com.example.excelapp.service;

import com.example.excelapp.model.Record;
import com.example.excelapp.repository.RecordRepository;
import jakarta.persistence.EntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecordInserter {
    private final RecordRepository recordRepository;
    private final EntityManager entityManager;

    public RecordInserter(RecordRepository recordRepository, EntityManager entityManager) {
        this.recordRepository = recordRepository;
        this.entityManager = entityManager;
    }

    // המסלול המהיר: שומר את כל השורות בבת אחת, בטרנזקציה אחת (כמו קודם) - מתאים לרוב המקרים
    // (בלי כפילויות אמיתיות). אם משהו כן מתנגש, כל הטרנזקציה מתבטלת ומוחזר null כדי לעבור למסלול האיטי
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<Record> saveAllOrNull(List<Record> records) {
        try {
            List<Record> saved = recordRepository.saveAll(records);
            recordRepository.flush();
            saved.forEach(entityManager::refresh);
            return saved;
        } catch (DataIntegrityViolationException e) {
            return null;
        }
    }

    // המסלול האיטי: שומר רשומה אחת בטרנזקציה נפרדת משלה - רק כשהמסלול המהיר נכשל,
    // כדי שרשומה בודדת שמתנגשת (hash_code כפול) תדולג בלי להפיל את כל השאר
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Record saveOrSkip(Record record) {
        try {
            Record saved = recordRepository.saveAndFlush(record);
            entityManager.refresh(saved);
            return saved;
        } catch (DataIntegrityViolationException e) {
            return null;
        }
    }
}
