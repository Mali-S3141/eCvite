package com.example.excelapp.controller;

import com.example.excelapp.entity.recipients;
import com.example.excelapp.repository.RecipientsRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recipients")
@CrossOrigin(origins = "*")
public class RecipientController {

    private final RecipientsRepository recipientRepository;

    public RecipientController( RecipientsRepository recipientRepository1) {
        this.recipientRepository = recipientRepository1;

    }

    @PostMapping("/add")
    public ResponseEntity<recipients> insertRecipient(@RequestBody recipients newRecipient) {

        // יצירת ה-HashCode
        newRecipient.setHashCode(newRecipient.generateRowHashCode());

        // שמירה במסד הנתונים
        recipients savedRecipient = recipientRepository.save(newRecipient);





        // החזרת הרשומה שנשמרה
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRecipient);
    }

}