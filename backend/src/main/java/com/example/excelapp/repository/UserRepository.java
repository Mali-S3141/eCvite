package com.example.excelapp.repository;

import com.example.excelapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    User findByPhone(String phone);
}
