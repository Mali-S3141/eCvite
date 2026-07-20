package com.example.excelapp.repository;

import com.example.excelapp.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationRepository
        extends JpaRepository<EmailVerification, String> {

}
