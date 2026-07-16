package com.example.excelapp.service;



import com.example.excelapp.entity.Recipients;
import com.example.excelapp.repository.RecipientsRepository;
import com.example.excelapp.repository.UserRecipientsRepository;
import com.example.excelapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipientsService {

    private final RecipientsRepository recipientsRepository;
    private final UserRecipientsRepository userRecipientsRepository;
    private final UserRepository userRepository;


    public boolean updateAllHashCodes() {

        try {
            // שליפת כל הטבלה מה-DB
            List<Recipients> recipientsList = recipientsRepository.findAll();

            // מעבר על כל שורה
            for (Recipients recipient : recipientsList) {

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

