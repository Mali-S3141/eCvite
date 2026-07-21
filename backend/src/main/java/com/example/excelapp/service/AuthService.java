package com.example.excelapp.service;

import com.example.excelapp.entity.User;
import com.example.excelapp.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    public User register(User user) {
        if (user.getHashCode() == null || user.getHashCode().isEmpty()) {
            user.setHashCode(user.generateHashCode());
        }
        return userRepository.save(user);
    }
    public User findUser(String name, String phone) {
        return userRepository.findByPhone(phone);
    }
}