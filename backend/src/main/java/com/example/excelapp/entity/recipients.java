package com.example.excelapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
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
}
