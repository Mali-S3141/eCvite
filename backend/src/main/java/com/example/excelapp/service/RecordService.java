package com.example.excelapp.service;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import com.example.excelapp.repository.RecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RecordService {
    private final RecordRepository recordRepository;

    public RecordService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    public List<Record> findByUser(User user) {
        return recordRepository.findByUser(user);
    }

    public void saveAll(List<Record> records) {
        recordRepository.saveAll(records);
    }

    public List<Record> importRecords(User user, List<Map<String, String>> values) {
        List<Record> records = values.stream().map(data -> Record.builder()
                .user(user)
                .name(getValue(data, "name", "שם"))
                .phone(getValue(data, "phone", "טלפון"))
                .city(getValue(data, "city", "עיר"))
                .neighborhood(getValue(data, "neighborhood", "שכונה"))
                .street(getValue(data, "street", "רחוב"))
                .houseNumber(getValue(data, "houseNumber", "house_number", "מספר בית", "מס' בית"))
                .address(getValue(data, "address", "כתובת"))
                .email(getValue(data, "email", "מייל"))
                .build())
                .collect(Collectors.toList());

        return recordRepository.saveAll(records);
    }

    private String getValue(Map<String, String> data, String... keys) {
        for (String key : keys) {
            if (data.containsKey(key) && data.get(key) != null) {
                String value = data.get(key).trim();
                if (!value.isEmpty()) {
                    return value;
                }
            }
        }
        return "";
    }
}
