package com.example.excelapp.repository;

import com.example.excelapp.entity.User;
import com.example.excelapp.entity.UserRecipients;
import com.example.excelapp.entity.Recipients;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRecipientsRepository
        extends JpaRepository<UserRecipients, Long> {

    boolean existsByUserAndRecipient(User user, Recipients recipient);

    // JOIN FETCH טוען את ה-recipient המקושר באותה שאילתה - בלי זה, כל recipient
    // נטען ב-SELECT נפרד משלו (N+1), מה שהפך טעינת נמענים למשתמש עם הרבה רשומות לאיטית מאוד
    @Query("SELECT ur FROM UserRecipients ur JOIN FETCH ur.recipient WHERE ur.user = :user")
    List<UserRecipients> findByUser(@Param("user") User user);
}
