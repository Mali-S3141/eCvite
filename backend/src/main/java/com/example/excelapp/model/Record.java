package com.example.excelapp.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "recipients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Record {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    // מחושב אוטומטית ב-DB (טריגר של רחלי) - הקוד שלנו לא קובע/משנה את הערך הזה בכלל
    @Column(name = "hash_code", insertable = false, updatable = false)
    private String hashCode;

    @Column
    private String prefix;

    @Column
    private String man;

    @Column
    private String woman;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "father_name")
    private String fatherName;

    @Column(name = "mother_name")
    private String motherName;

    @Column
    private String phone;

    @Column
    private String mail;

    @Column
    private String country;

    @Column
    private String city;

    @Column
    private String street;

    @Column(name = "house_no")
    private String houseNo;

    @Column(name = "belongs_to")
    private String belongsTo;

    @Column
    private String suffix;

    @Column
    private String display;

    @Column
    private Boolean print;

    @Column
    private Boolean changed;

    @Column(name = "change_date")
    private LocalDate changeDate;

    @Column(name = "change_by")
    private String changeBy;

    @Column(name = "created_by")
    private String createdBy;
}
