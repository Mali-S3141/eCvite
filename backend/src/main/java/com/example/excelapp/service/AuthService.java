package com.example.excelapp.service;

import com.example.excelapp.model.User;
import com.example.excelapp.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User loginOrCreate(String name, String phone) {
        return userRepository.findByPhone(phone)
                .orElseGet(() -> userRepository.save(User.builder().name(name).phone(phone).build()));
    }
}

