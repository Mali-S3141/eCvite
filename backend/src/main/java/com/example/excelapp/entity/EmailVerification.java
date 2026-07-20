package com.example.excelapp.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification")
@Data
public class EmailVerification {

    @Id
    private String email;

    private String code;

    private LocalDateTime expiresAt;

    private boolean verified;
}