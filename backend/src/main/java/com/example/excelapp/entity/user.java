package com.example.excelapp.entity;

import jakarta.persistence.*;
import java.util.Objects;
@Entity
@Table(name = "app_users") // שינוי שם הטבלה ל-app_users כדי לעקוף את המילה השמורה user

    // שאר הקוד של המשתנים, הבנאים, הגטרים והסטרים נשאר בדיוק אותו דבר...

// שם הטבלה ב-Neon
public class user {




 // חובה לייבא עבור ה-Hash


            @Id
            @GeneratedValue(strategy = GenerationType.IDENTITY)
            private Long id;

            private String firstName; // שם פרטי
            private String lastName;  // שם משפחה
            private String phone;     // פלאפון (מומלץ כ-String כדי לשמור על ה-0 בהתחלה)

            // בנאי ריק (חובה)
            public user() {}

            // --- הפונקציה שמייצרת ומחזירה את קוד ה-Hash ---
            public int generateRowHashCode() {
                // מתודה זו מקבלת את שלושת הערכים של השורה הנוכחית
                // ומייצרת מהם מספר האש (int) ייחודי ומאובטח על בסיס שילוב הערכים שלהם
                return Objects.hash(this.phone, this.firstName, this.lastName);
            }

            // גטרים וסטרים (Getters & Setters)
            public String getFirstName() { return firstName; }
            public void setFirstName(String firstName) { this.firstName = firstName; }

            public String getLastName() { return lastName; }
            public void setLastName(String lastName) { this.lastName = lastName; }

            public String getPhone() { return phone; }
            public void setPhone(String phone) { this.phone = phone; }

            public Long getId() { return id; }
        }
