package com.example.excelapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name_man")
    private String firstNameMan;

    @Column(name = "first_name_woman")
    private String firstNameWoman;

    @Column(name = "last_name")
    private String lastName;

    @Column(unique = true)
    private String phone;

    private String email;

    @Column(name = "event_type")
    private String eventType;

    private String city;

    private String street;

    @Column(name = "house_number")
    private String houseNumber;
}