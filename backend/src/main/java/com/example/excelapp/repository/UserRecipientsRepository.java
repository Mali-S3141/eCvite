package com.example.excelapp.repository;

import com.example.excelapp.entity.User;
import com.example.excelapp.entity.UserRecipients;
import com.example.excelapp.entity.Recipients;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRecipientsRepository
        extends JpaRepository<UserRecipients, Long> {

    boolean existsByUserAndRecipient(User user, Recipients recipient);

    List<UserRecipients> findByUser(User user);}
