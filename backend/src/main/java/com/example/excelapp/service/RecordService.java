package com.example.excelapp.service;

import com.example.excelapp.entity.User;
import com.example.excelapp.model.Record;
import com.example.excelapp.repository.RecordRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecordService {
    private final RecordRepository recordRepository;
    private final EntityManager entityManager;
    private final RecordInserter recordInserter;

    public RecordService(RecordRepository recordRepository, EntityManager entityManager, RecordInserter recordInserter) {
        this.recordRepository = recordRepository;
        this.entityManager = entityManager;
        this.recordInserter = recordInserter;
    }

    public List<Record> findByUser(User user) {
        return recordRepository.findByUserOrderByIdAsc(user);
    }
    @Transactional
    public List<Record> saveAll(User user, List<Record> records) {
        List<Record> toSave = records.stream()
                .map(incoming -> reconcile(user, incoming))
                .collect(Collectors.toList());

        List<Record> saved = recordRepository.saveAll(toSave);
        recordRepository.flush();
        applyGeneratedHashCodes(saved);
        return saved;
    }

    // ה-hash_code נקבע ע"י טריגר ב-DB (לא על ידינו) - שאילתה גולמית אחת בשביל כל הרשומות
    // ביחד, כדי לקבל את הערך העדכני בלי refresh נפרד לכל רשומה (שהיה איטי מאוד על ייבוא גדול)
    private void applyGeneratedHashCodes(List<Record> saved) {
        if (saved.isEmpty()) {
            return;
        }
        List<Long> ids = saved.stream().map(Record::getId).collect(Collectors.toList());
        Map<Long, String> hashById = recordRepository.findHashCodesByIds(ids).stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> (String) row[1]));
        saved.forEach(r -> r.setHashCode(hashById.get(r.getId())));
    }

    // מחיקה מפורשת של רשומות ספציפיות שנבחרו במסך (לא לפי "מה שחסר" ברשימה שנשלחה) -
    // כי הטבלה משותפת לכולם, ואי אפשר לדעת אם רשומה חסרה כי נמחקה או כי מישהי אחרת פשוט לא שלחה אותה
    public void deleteByIds(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            recordRepository.deleteAllById(ids);
        }
    }
//קובע מי יצר/שינה ומתי, בשרת בלבד
    private Record reconcile(User user, Record incoming) {
        incoming.setUser(user);

        if (incoming.getId() == null) {

            incoming.setChanged(false);
            incoming.setChangeDate(null);
            incoming.setChangeBy(null);
            return incoming;
        }

        Record existing = recordRepository.findById(incoming.getId()).orElse(null);
        if (existing == null) {

            incoming.setChanged(false);
            incoming.setChangeDate(null);
            incoming.setChangeBy(null);
            return incoming;
        }

        incoming.setCreatedBy(existing.getCreatedBy());

        if (hasContentChanged(existing, incoming)) {
            incoming.setChanged(true);
            incoming.setChangeDate(LocalDate.now());

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
                || !Objects.equals(a.getNeighborhood(), b.getNeighborhood())
                || !Objects.equals(a.getStreet(), b.getStreet())
                || !Objects.equals(a.getHouseNo(), b.getHouseNo())
                || !Objects.equals(a.getAddressNote(), b.getAddressNote())
                || !Objects.equals(a.getBelongsTo(), b.getBelongsTo())
                || !Objects.equals(a.getSuffix(), b.getSuffix())
                || !Objects.equals(a.getPrint(), b.getPrint());
    }

    @Transactional
    public ImportResult importRecords(User user, List<Map<String, Object>> values) {
        List<Record> candidates = values.stream().map(data -> Record.builder()
                .user(user)
                .prefix(getValue(data, "prefix", "קידומת"))
                .man(getValue(data, "man", "בעל"))
                .woman(getValue(data, "woman", "אישה"))
                .lastName(getValue(data, "lastName", "last_name", "שם משפחה"))
                .fatherName(getValue(data, "fatherName", "father_name", "שם האב"))
                .motherName(getValue(data, "motherName", "mother_name", "שם האם"))
                .phone(getValue(data, "phone", "טלפון"))
                .mail(getValue(data, "mail", "email", "מייל"))
                .country(getValue(data, "country", "מדינה", "ארץ"))
                .city(getValue(data, "city", "עיר"))
                .neighborhood(getValue(data, "neighborhood", "שכונה"))
                .street(getValue(data, "street", "רחוב"))
                .houseNo(getValue(data, "houseNo", "house_no", "houseNumber", "house_number", "מספר בית", "מס' בית"))
                .addressNote(getValue(data, "addressNote", "address_note", "הערת כתובת"))
                .belongsTo(getValue(data, "belongsTo", "belongs_to", "שייך ל"))
                .suffix(getValue(data, "suffix", "סיומת"))
                .print(false)
                .changed(false)

                .build())
                .collect(Collectors.toList());

        // מחשבים מראש את אותו hash_code שהטריגר ב-DB יחשב (טלפון + בעל/אישה + שם משפחה),
        // כדי לדלג מראש על "אורחים" כפולים ולא להפיל את כל הייבוא בגלל שורה אחת כפולה
        List<String> candidateHashes = new ArrayList<>();
        Set<String> hashes = new HashSet<>();
        for (Record r : candidates) {
            String hash = computeHash(r.getPhone(), r.getMan(), r.getWoman(), r.getLastName());
            candidateHashes.add(hash);
            hashes.add(hash);
        }

        Set<String> existingHashes = new HashSet<>(recordRepository.findExistingHashCodes(hashes));
        Set<String> seenInBatch = new HashSet<>();
        List<Record> toInsert = new ArrayList<>();
        int skipped = 0;
        for (int i = 0; i < candidates.size(); i++) {
            String hash = candidateHashes.get(i);
            if (existingHashes.contains(hash) || !seenInBatch.add(hash)) {
                skipped++;
                continue;
            }
            toInsert.add(candidates.get(i));
        }

        // מסלול מהיר: מנסים לשמור הכל בבת אחת (כמו קודם - מהיר). רק אם זה נכשל
        // (למשל התנגשות אמיתית שהבדיקה המוקדמת לא תפסה), עוברים למסלול איטי שורה-שורה
        List<Record> saved = recordInserter.saveAllOrNull(toInsert);
        if (saved == null) {
            saved = new ArrayList<>();
            for (Record record : toInsert) {
                Record result = recordInserter.saveOrSkip(record);
                if (result != null) {
                    saved.add(result);
                } else {
                    skipped++;
                }
            }
        }
        return new ImportResult(saved, skipped);
    }

    // חייב להיות זהה בדיוק לפונקציית ה-DB create_recipient_hash(), אחרת נחשוב שרשומה לא כפולה בזמן שהיא כן
    private String computeHash(String phone, String man, String woman, String lastName) {
        String namePart = (man != null && !man.isEmpty()) ? man : (woman != null ? woman : "");
        String base = (phone != null ? phone : "") + namePart + (lastName != null ? lastName : "");
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    // ערכים מ-Excel יכולים להגיע כמספר (Integer/Double) ולא רק כטקסט - תמיד ממירים בבטחה למחרוזת
    private String getValue(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object raw = data.get(key);
            if (raw != null) {
                String value = String.valueOf(raw).trim();
                if (!value.isEmpty()) {
                    return value;
                }
            }
        }
        return "";
    }
}
