package com.example.excelapp.entity;

import com.example.excelapp.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;


    @Entity
    @Table(name = "user_recipients")
    @Data
    @NoArgsConstructor
    public class UserRecipients {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;


        @ManyToOne
        @JoinColumn(name = "user_id")
        private User user;


        @ManyToOne
        @JoinColumn(name = "recipient_id")
        private recipients recipient;
    }

