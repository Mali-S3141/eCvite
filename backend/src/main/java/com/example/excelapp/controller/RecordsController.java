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

    @GetMapping
    public List<Record> getRecords(@RequestParam String phone) {
        User user = userRepository.findByPhone(phone).orElseThrow();
        return recordService.findByUser(user);
    }

    @PostMapping("/save")
    public ResponseEntity<List<Record>> saveRecords(@RequestBody Map<String, Object> request) {
        String phone = (String) request.get("phone");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> values = (List<Map<String, Object>>) request.get("records");
        User user = userRepository.findByPhone(phone).orElseThrow();

        List<Record> records = values.stream().map(data -> Record.builder()
                .id(data.get("id") != null ? Long.valueOf(String.valueOf(data.get("id"))) : null)
                .prefix(getString(data, "prefix"))
                .man(getString(data, "man"))
                .woman(getString(data, "woman"))
                .lastName(getString(data, "lastName"))
                .fatherName(getString(data, "fatherName"))
                .motherName(getString(data, "motherName"))
                .phone(getString(data, "phone"))
                .mail(getString(data, "mail"))
                .country(getString(data, "country"))
                .city(getString(data, "city"))
                .street(getString(data, "street"))
                .houseNo(getString(data, "houseNo"))
                .belongsTo(getString(data, "belongsTo"))
                .suffix(getString(data, "suffix"))
                .display(getString(data, "display"))
                .print(getBoolean(data, "print"))
                .build())
                .toList();

        List<Record> saved = recordService.saveAll(user, records);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/import")
    public List<Record> importRecords(@RequestBody Map<String, Object> request) {
        String phone = (String) request.get("phone");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> values = (List<Map<String, String>>) request.get("records");
        User user = userRepository.findByPhone(phone).orElseThrow();
        return recordService.importRecords(user, values);
    }

    private String getString(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value != null ? String.valueOf(value) : "";
    }

    private Boolean getBoolean(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
