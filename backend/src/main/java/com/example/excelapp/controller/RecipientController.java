package com.example.excelapp.controller;

import com.example.excelapp.entity.User;
import com.example.excelapp.entity.UserRecipientId;
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
import org.springframework.transaction.annotation.Transactional;
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
    @Autowired
    private final UserRecipientsRepository userRecipientsRepository;

    @Autowired
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
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getRecipients(
            @RequestParam String phone
    ) {

        User user = userRepository.findByPhone(phone);

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }

        List<UserRecipients> links =
                userRecipientsRepository.findByUser(user);

        List<Recipients> recipients = links.stream()
                .map(UserRecipients::getRecipient)
                .toList();

        return ResponseEntity.ok(recipients);
    }
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveRecipients(
            @RequestBody SaveRecipientsRequest request
    ) {

        User user = userRepository.findByPhone(request.getPhone());

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }


        List<Recipients> savedRecipients = new ArrayList<>();


        for (Recipients recipient : request.getRecipients()) {


            // יצירת hash
            String hash = recipient.generateRowHashCode();
            recipient.setHashCode(hash);


            Recipients savedRecipient =
                    recipientRepository.findById(hash)
                            .orElse(null);


            if (savedRecipient == null) {

                savedRecipient =
                        recipientRepository.saveAndFlush(recipient);

                System.out.println(
                        "RECIPIENT SAVED: "
                                + savedRecipient.getHashCode()
                );

            } else {

                System.out.println(
                        "RECIPIENT EXISTS: "
                                + savedRecipient.getHashCode()
                );
            }


            // יצירת הקישור
            UserRecipientId id =
                    new UserRecipientId(
                            user.getHashCode(),
                            savedRecipient.getHashCode()
                    );


            if (!userRecipientsRepository.existsById(id)) {


                UserRecipients link =
                        new UserRecipients();

                link.setId(id);
                link.setUser(user);
                link.setRecipient(savedRecipient);


                userRecipientsRepository.saveAndFlush(link);


                System.out.println(
                        "LINK CREATED: "
                                + user.getHashCode()
                                + " -> "
                                + savedRecipient.getHashCode()
                );
            }


            savedRecipients.add(savedRecipient);
        }


        return ResponseEntity.ok(savedRecipients);
    }
    @PostMapping("/import")
    @Transactional
    public ResponseEntity<?> importRecipients(
            @RequestBody SaveRecipientsRequest request
    ) {

        User user = userRepository.findByPhone(request.getPhone());

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }

        // יצירת hash למשתמש אם עדיין אין
        if (user.getHashCode() == null || user.getHashCode().isBlank()) {
            user.setHashCode(user.generateHashCode());
            userRepository.save(user);
        }

        List<Recipients> savedRecipients = new ArrayList<>();
        for (Recipients recipient : savedRecipients) {

            UserRecipientId id = new UserRecipientId(
                    user.getHashCode(),
                    recipient.getHashCode()
            );


            if (!userRecipientsRepository.existsById(id)) {

                UserRecipients link = new UserRecipients();

                link.setId(id);
                link.setUser(user);
                link.setRecipient(recipient);

                userRecipientsRepository.save(link);

                System.out.println(
                        "LINK CREATED: "
                                + user.getHashCode()
                                + " -> "
                                + recipient.getHashCode()
                );
            }
        }

        return ResponseEntity.ok(savedRecipients);}}