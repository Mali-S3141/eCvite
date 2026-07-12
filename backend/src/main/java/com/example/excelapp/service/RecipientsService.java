package com.example.excelapp.service;



import com.example.excelapp.entity.recipients;
import com.example.excelapp.repository.RecipientsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipientsService {

    private final RecipientsRepository recipientsRepository;


    public boolean updateAllHashCodes() {

        try {
            // שליפת כל הטבלה מה-DB
            List<recipients> recipientsList = recipientsRepository.findAll();

            // מעבר על כל שורה
            for (recipients recipient : recipientsList) {

                // יצירת hash לפי הנתונים בשורה
                String newHash = recipient.generateRowHashCode();

                // עדכון השדה hash_code
                recipient.setHashCode(newHash);
            }

            // שמירת כל השינויים ל-DB
            recipientsRepository.saveAll(recipientsList);

            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}

