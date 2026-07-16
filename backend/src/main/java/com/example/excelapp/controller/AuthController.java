package com.example.excelapp.controller;

import com.example.excelapp.entity.User;
import com.example.excelapp.repository.UserRepository;
import com.example.excelapp.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {
    private final AuthService authService;
private final UserRepository userRepository;
    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String phone = request.get("phone");

        if (name == null || phone == null) {
            return ResponseEntity.badRequest().build();
        }

        User user = authService.findUser(name, phone);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(user);
    }
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody User user) {

        if (userRepository.findByPhone(user.getPhone()) != null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(authService.register(user));
    }

}
