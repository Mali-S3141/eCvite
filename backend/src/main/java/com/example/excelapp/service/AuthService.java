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

        System.out.println("לפני יצירת hash:");
        System.out.println(user);

        String hash = user.generateHashCode();

        System.out.println("Hash שנוצר: " + hash);

        user.setHashCode(hash);

        System.out.println("אחרי setHashCode:");
        System.out.println(user);

        return userRepository.save(user);
    }
    public User findUser(String name, String phone) {
        return userRepository.findByPhone(phone);
    }
}