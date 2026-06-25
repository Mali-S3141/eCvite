package com.example.excelapp.controller;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import com.example.excelapp.repository.UserRepository;
import com.example.excelapp.service.RecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/records")
@CrossOrigin(origins = "http://localhost:3000")
public class RecordsController {
    private final RecordService recordService;
    private final UserRepository userRepository;

    public RecordsController(RecordService recordService, UserRepository userRepository) {
        this.recordService = recordService;
        this.userRepository = userRepository;
    }

    private User getUserFromRequest(Map<String, String> request) {
        String phone = request.get("phone");
        return userRepository.findByPhone(phone).orElseThrow();
    }

    @GetMapping
    public List<Record> getRecords(@RequestParam String phone) {
        User user = userRepository.findByPhone(phone).orElseThrow();
        return recordService.findByUser(user);
    }

    @PostMapping("/save")
    public ResponseEntity<Void> saveRecords(@RequestBody Map<String, Object> request) {
        String phone = (String) request.get("phone");
        List<Map<String, String>> values = (List<Map<String, String>>) request.get("records");
        User user = userRepository.findByPhone(phone).orElseThrow();
        List<Record> records = values.stream().map(data -> Record.builder()
                .id(data.get("id") != null ? Long.valueOf(String.valueOf(data.get("id"))) : null)
                .user(user)
                .name(data.getOrDefault("name", ""))
                .phone(data.getOrDefault("phone", ""))
                .city(data.getOrDefault("city", ""))
                .neighborhood(data.getOrDefault("neighborhood", ""))
                .street(data.getOrDefault("street", ""))
                .houseNumber(data.getOrDefault("houseNumber", data.getOrDefault("house_number", "")))
                .address(data.getOrDefault("address", ""))
                .email(data.getOrDefault("email", ""))
                .build())
                .toList();
        recordService.saveAll(records);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/import")
    public List<Record> importRecords(@RequestBody Map<String, Object> request) {
        String phone = (String) request.get("phone");
        List<Map<String, String>> values = (List<Map<String, String>>) request.get("records");
        User user = userRepository.findByPhone(phone).orElseThrow();
        return recordService.importRecords(user, values);
    }
}
