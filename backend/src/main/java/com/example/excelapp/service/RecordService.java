package com.example.excelapp.service;

import com.example.excelapp.model.Record;
import com.example.excelapp.model.User;
import com.example.excelapp.repository.RecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
//מחיקת שורות שהוסרו)
    public List<Record> saveAll(User user, List<Record> records) {
        List<Record> toSave = records.stream()
                .map(incoming -> reconcile(user, incoming))
                .collect(Collectors.toList());

        Set<Long> keepIds = toSave.stream()
                .map(Record::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<Record> toDelete = recordRepository.findByUser(user).stream()
                .filter(existing -> !keepIds.contains(existing.getId()))
                .collect(Collectors.toList());
        recordRepository.deleteAll(toDelete);

        return recordRepository.saveAll(toSave);
    }
//קובע מי יצר/שינה ומתי, בשרת בלבד
    private Record reconcile(User user, Record incoming) {
        incoming.setUser(user);

        if (incoming.getId() == null) {
            incoming.setHashCode(generateHashCode(incoming));
            incoming.setCreatedBy(user.getName());
            incoming.setChanged(false);
            incoming.setChangeDate(null);
            incoming.setChangeBy(null);
            return incoming;
        }

        Record existing = recordRepository.findById(incoming.getId()).orElse(null);
        if (existing == null) {
            incoming.setHashCode(generateHashCode(incoming));
            incoming.setCreatedBy(user.getName());
            incoming.setChanged(false);
            incoming.setChangeDate(null);
            incoming.setChangeBy(null);
            return incoming;
        }

        incoming.setHashCode(existing.getHashCode());
        incoming.setCreatedBy(existing.getCreatedBy());

        if (hasContentChanged(existing, incoming)) {
            incoming.setChanged(true);
            incoming.setChangeDate(LocalDate.now());
            incoming.setChangeBy(user.getName());
        } else {
            incoming.setChanged(existing.getChanged());
            incoming.setChangeDate(existing.getChangeDate());
            incoming.setChangeBy(existing.getChangeBy());
        }

        return incoming;
    }

    private boolean hasContentChanged(Record a, Record b) {
        return !Objects.equals(a.getPrefix(), b.getPrefix())
                || !Objects.equals(a.getMan(), b.getMan())
                || !Objects.equals(a.getWoman(), b.getWoman())
                || !Objects.equals(a.getLastName(), b.getLastName())
                || !Objects.equals(a.getFatherName(), b.getFatherName())
                || !Objects.equals(a.getMotherName(), b.getMotherName())
                || !Objects.equals(a.getPhone(), b.getPhone())
                || !Objects.equals(a.getMail(), b.getMail())
                || !Objects.equals(a.getCountry(), b.getCountry())
                || !Objects.equals(a.getCity(), b.getCity())
                || !Objects.equals(a.getStreet(), b.getStreet())
                || !Objects.equals(a.getHouseNo(), b.getHouseNo())
                || !Objects.equals(a.getBelongsTo(), b.getBelongsTo())
                || !Objects.equals(a.getSuffix(), b.getSuffix())
                || !Objects.equals(a.getDisplay(), b.getDisplay())
                || !Objects.equals(a.getPrint(), b.getPrint());
    }

    private String generateHashCode(Record record) {
        int hash = Objects.hash(record.getMan(), record.getWoman(), record.getLastName(), record.getPhone());
        return Integer.toHexString(hash);
    }

    public List<Record> importRecords(User user, List<Map<String, String>> values) {
        List<Record> records = values.stream().map(data -> Record.builder()
                .user(user)
                .prefix(getValue(data, "prefix", "קידומת"))
                .man(getValue(data, "man", "בעל"))
                .woman(getValue(data, "woman", "אישה"))
                .lastName(getValue(data, "lastName", "last_name", "שם משפחה"))
                .fatherName(getValue(data, "fatherName", "father_name", "שם האב"))
                .motherName(getValue(data, "motherName", "mother_name", "שם האם"))
                .phone(getValue(data, "phone", "טלפון"))
                .mail(getValue(data, "mail", "email", "מייל"))
                .country(getValue(data, "country", "מדינה"))
                .city(getValue(data, "city", "עיר"))
                .street(getValue(data, "street", "רחוב"))
                .houseNo(getValue(data, "houseNo", "house_no", "houseNumber", "house_number", "מספר בית", "מס' בית"))
                .belongsTo(getValue(data, "belongsTo", "belongs_to", "שייך ל"))
                .suffix(getValue(data, "suffix", "סיומת"))
                .display(getValue(data, "display", "תצוגה"))
                .print(false)
                .changed(false)
                .createdBy(user.getName())
                .build())
                .peek(record -> record.setHashCode(generateHashCode(record)))
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
