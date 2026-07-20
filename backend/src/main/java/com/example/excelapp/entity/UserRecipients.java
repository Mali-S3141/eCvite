package com.example.excelapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_recipients")
@Data
@NoArgsConstructor
public class UserRecipients {

    @EmbeddedId
    private UserRecipientId id;

    @ManyToOne
    @MapsId("userHashCode")
    @JoinColumn(
            name="user_hash_code",
            referencedColumnName="hash_code"
    )
    private User user;


    @ManyToOne
    @MapsId("recipientHashCode")
    @JoinColumn(
            name="recipient_hash_code",
            referencedColumnName="hash_code"
    )
    private Recipients recipient;
}