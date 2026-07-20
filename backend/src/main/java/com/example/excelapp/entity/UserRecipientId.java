package com.example.excelapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRecipientId implements Serializable {

    @Column(name = "user_hash_code")
    private String userHashCode;

    @Column(name = "recipient_hash_code")
    private String recipientHashCode;
}
