package com.example.excelapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "recipients") // שם הטבלה ב-Neon
@Data // <--- האנוטציה הזו מייצרת את כל ה-Setters וה-Getters אוטומטית!
@NoArgsConstructor // מייצר קונסטרקטור ריק שחובה עבור JPA
public class recipients {

    @Id
    @Column(name = "hash_code")
    private String hashCode; // מפתח

    private String man;
    private String woman;

    @Column(name = "last_name")
    private String lastName;

    private String phone;
    private String mail;

    @Column(name = "father_name")
    private String fatherName;

    @Column(name = "mother_name")
    private String motherName;

    private String country;
    private String city;
    private String street;

    @Column(name = "house_no")
    private String houseNo;

    @Column(name = "belongs_to")
    private String belongsTo;

    private String prefix;
    private String suffix;

    private boolean changed; // flag

    @Column(name = "change_date")
    private LocalDate changeDate; // date

    @Column(name = "change_by")
    private String changeBy;

    @Column(name = "created_by")
    private String createdBy;

    private boolean print; // flag
    private String display;
    public String generateRowHashCode() {
        try {
            String data =
                    Objects.toString(man, "") +
                            Objects.toString(woman, "") +
                            Objects.toString(lastName, "") +
                            Objects.toString(phone, "");

            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }

            return sb.toString();

        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error generating hash", e);
        }
    }
}

