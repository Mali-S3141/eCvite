package com.example.excelapp.controller;

import com.example.excelapp.entity.User;
import com.example.excelapp.entity.UserRecipients;
import com.example.excelapp.entity.Recipients;
import com.example.excelapp.repository.RecipientsRepository;
import com.example.excelapp.dto.SaveRecipientsRequest;
import com.example.excelapp.repository.UserRecipientsRepository;
import com.example.excelapp.repository.UserRepository;
import com.example.excelapp.service.ExcelService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/recipients")
@CrossOrigin(
        origins = "http://localhost:3000",
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        }
)
public class RecipientController {

    private final RecipientsRepository recipientRepository;
    private final UserRecipientsRepository userRecipientsRepository;
    private final UserRepository userRepository;

    @Autowired
    private ExcelService excelService;


    public RecipientController(
            RecipientsRepository recipientRepository,
            UserRecipientsRepository userRecipientsRepository,
            UserRepository userRepository
    ) {
        this.recipientRepository = recipientRepository;
        this.userRecipientsRepository = userRecipientsRepository;
        this.userRepository = userRepository;
    }


    @PostMapping("/save")
    public ResponseEntity<?> saveRecipients(
            @RequestBody SaveRecipientsRequest request
    ) {

        User user = userRepository.findByPhone(request.getPhone());
        System.out.println("SAVE RECIPIENTS START");

        System.out.println(
                "PHONE: " + request.getPhone()
        );

        System.out.println(
                "COUNT: " + request.getRecipients().size()
        );
        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }


        List<Recipients> savedRecipients = new ArrayList<>();


        for (Recipients r : request.getRecipients()) {

                System.out.println(
                        "RECIPIENT: " +
                                r.getMan() + " " +
                                r.getLastName() +
                                " HASH=" + r.getHashCode()
                );

            // יצירת hash אם חסר
            if (r.getHashCode() == null || r.getHashCode().isEmpty()) {
                r.setHashCode(r.generateRowHashCode());
            }


            // בדיקה האם הנמען כבר קיים
            Recipients existing =
                    recipientRepository.findById(r.getHashCode())
                            .orElse(null);


            if (existing != null) {

                // כבר קיים - משתמשים בו
                savedRecipients.add(existing);

            } else {

                // חדש - שומרים
                Recipients saved =
                        recipientRepository.save(r);

                savedRecipients.add(saved);
            }
        }


        // יצירת מצביעים למשתמש
        List<UserRecipients> links = savedRecipients.stream()
                .filter(recipient ->
                        !userRecipientsRepository.existsByUserAndRecipient(user, recipient)
                )
                .map(recipient -> {

                    UserRecipients link = new UserRecipients();

                    link.setUser(user);
                    link.setRecipient(recipient);

                    return link;

                })
                .toList();


        userRecipientsRepository.saveAll(links);
        return null;
    }


    @GetMapping
    public ResponseEntity<?> getRecipients() {

        return ResponseEntity.ok(
                recipientRepository.findAll()
        );
    }



    @PostMapping("/add")
    public ResponseEntity<Recipients> insertRecipient(
            @RequestBody Recipients newRecipient
    ) {

        newRecipient.setHashCode(
                newRecipient.generateRowHashCode()
        );


        Recipients savedRecipient =
                recipientRepository.save(newRecipient);


        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedRecipient);
    }



    @PostMapping("/import")
    public ResponseEntity<?> importRecipients(
            @RequestBody SaveRecipientsRequest request
    ) {

        User user = userRepository.findByPhone(request.getPhone());

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }


        for (Recipients recipient : request.getRecipients()) {

            // יצירת hash אם אין
            if (recipient.getHashCode() == null) {
                recipient.setHashCode(
                        recipient.generateRowHashCode()
                );
            }
        }


        List<Recipients> savedRecipients =
                recipientRepository.saveAll(request.getRecipients());


        List<UserRecipients> links =
                savedRecipients.stream()
                        .map(recipient -> {

                            UserRecipients link =
                                    new UserRecipients();

                            link.setUser(user);
                            link.setRecipient(recipient);

                            return link;

                        })
                        .toList();


        userRecipientsRepository.saveAll(links);


        return ResponseEntity.ok(
                savedRecipients
        );
    }
}