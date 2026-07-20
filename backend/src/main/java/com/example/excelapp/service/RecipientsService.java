package com.example.excelapp.service;


import com.example.excelapp.entity.Recipients;
import com.example.excelapp.entity.User;
import com.example.excelapp.entity.UserRecipientId;
import com.example.excelapp.entity.UserRecipients;
import com.example.excelapp.repository.RecipientsRepository;
import com.example.excelapp.repository.UserRecipientsRepository;
import com.example.excelapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Service
@RequiredArgsConstructor
public class RecipientsService {


    private final RecipientsRepository recipientsRepository;
    private final UserRecipientsRepository userRecipientsRepository;
    private final UserRepository userRepository;



    public boolean updateAllHashCodes() {

        try {

            List<Recipients> recipientsList =
                    recipientsRepository.findAll();


            for (Recipients recipient : recipientsList) {


                String newHash =
                        recipient.generateRowHashCode();


                recipient.setHashCode(newHash);
            }


            recipientsRepository.saveAll(recipientsList);


            return true;


        } catch (Exception e) {

            e.printStackTrace();

            return false;
        }
    }





    @Transactional
    public void saveRecipientsForUser(
            String userHashCode,
            List<Recipients> recipientsList
    ) {


        User user =
                userRepository.findById(userHashCode)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "User not found"
                                )
                        );



        for (Recipients recipient : recipientsList) {


            // יצירת hash לנמען
            String hash =
                    recipient.generateRowHashCode();


            recipient.setHashCode(hash);



            // אם הנמען לא קיים - שמירה
            Recipients savedRecipient =
                    recipientsRepository
                            .findById(hash)
                            .orElseGet(() ->
                                    recipientsRepository.save(recipient)
                            );



            // יצירת קשר משתמש-נמען

            UserRecipientId userRecipientId =
                    new UserRecipientId(
                            user.getHashCode(),
                            savedRecipient.getHashCode()
                    );



            // מניעת כפילות בקישור
            if (!userRecipientsRepository.existsById(userRecipientId)) {


                UserRecipients userRecipients =
                        new UserRecipients();


                userRecipients.setId(userRecipientId);


                userRecipients.setUser(user);


                userRecipients.setRecipient(savedRecipient);



                userRecipientsRepository.save(userRecipients);
            }
        }
    }
}