package com.example.excelapp.service;

import com.example.excelapp.entity.User;
import com.example.excelapp.repository.UserRepository;
import lombok.Builder;
import org.springframework.stereotype.Service;
@Builder
@Service
public class AuthService {
    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }


        public User loginOrCreate(String name, String phone) {

            return userRepository.findByPhone(phone)
                    .orElseGet(() -> {
                        User user = new User();
                        user.setName(name);
                        user.setPhone(phone);
                        return userRepository.save(user);
                    });
        }
    }


