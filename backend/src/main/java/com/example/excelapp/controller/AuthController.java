package com.example.excelapp.controller;

import com.example.excelapp.model.User;
import com.example.excelapp.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String phone = request.get("phone");
        if (name == null || phone == null) {
            return ResponseEntity.badRequest().build();
        }
        User user = authService.loginOrCreate(name, phone);
        return ResponseEntity.ok(user);
    }
}
