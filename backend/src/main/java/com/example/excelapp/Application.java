package com.example.excelapp; // ודאי ששם הפאקג' מתאים במדויק למבנה התיקיות שלך

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication // אנוטציה חובה שמפעילה את כל רכיבי ה-Spring והחיבורים
public class Application {

    public static void main(String[] args) {
        // שורת ההרצה המרכזית שמרימה את השרת ומחברת את ה-DataSource ל-Neon
        SpringApplication.run(Application.class, args);

        System.out.println("==========================================");
        System.out.println("🚀 Spring Boot עלה בהצלחה ומחובר ל-Neon!");
        System.out.println("==========================================");

    }
}

