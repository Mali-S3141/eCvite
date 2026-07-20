package com.example.excelapp.controller;

import com.example.excelapp.dto.EmailRequest;
import com.example.excelapp.dto.VerifyCodeRequest;
import com.example.excelapp.entity.EmailVerification;
import com.example.excelapp.entity.User;
import com.example.excelapp.repository.EmailVerificationRepository;
import com.example.excelapp.repository.UserRepository;
import com.example.excelapp.service.AuthService;
import com.example.excelapp.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
private final UserRepository userRepository;
    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }
    @Autowired
    private EmailService emailService;
    @Autowired
    private EmailVerificationRepository emailVerificationRepository;
    @PostMapping("/send-code")
    public ResponseEntity<String> sendCode(@RequestBody EmailRequest request) {

        String code = String.format("%06d",
                new java.util.Random().nextInt(1_000_000));

        EmailVerification verification = new EmailVerification();

        verification.setEmail(request.getEmail());
        verification.setCode(code);
        verification.setExpiresAt(
                java.time.LocalDateTime.now().plusMinutes(10)
        );
        verification.setVerified(false);

        emailVerificationRepository.save(verification);


        emailService.sendEmail(
                request.getEmail(),
                "קוד אימות",
                "קוד האימות שלך הוא: " + code
        );


        return ResponseEntity.ok("הקוד נשלח");
    }
    @PostMapping("/verify-code")
    public ResponseEntity<String> verifyCode(
            @RequestBody VerifyCodeRequest request
    ) {

        EmailVerification verification =
                emailVerificationRepository
                        .findById(request.getEmail())
                        .orElse(null);


        if (verification == null) {
            return ResponseEntity
                    .badRequest()
                    .body("לא נמצא קוד אימות");
        }


        if (!verification.getCode().equals(request.getCode())) {
            return ResponseEntity
                    .badRequest()
                    .body("קוד שגוי");
        }


        if (verification.getExpiresAt()
                .isBefore(java.time.LocalDateTime.now())) {

            return ResponseEntity
                    .badRequest()
                    .body("פג תוקף הקוד");
        }


        verification.setVerified(true);
        emailVerificationRepository.save(verification);


        return ResponseEntity.ok("המייל אומת בהצלחה");
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
    public ResponseEntity<User> register(@Valid @RequestBody User user) {

        if (userRepository.findByPhone(user.getPhone()) != null) {
            return ResponseEntity.badRequest().build();
        }
        System.out.println("User שהגיע מהפרונט:");
        System.out.println(user);
        return ResponseEntity.ok(authService.register(user));
    }

}
