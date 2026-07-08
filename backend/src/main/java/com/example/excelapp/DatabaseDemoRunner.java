package com.example.excelapp;

 import com.example.excelapp.entity.user;
 import com.example.excelapp.repository.UserRepository;
 import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseDemoRunner implements CommandLineRunner {

    private UserRepository userRepository;

    // Spring מזריק את ה-Repository אוטומטית
    public DatabaseDemoRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {

            System.out.println("--- בדיקת פונקציית ה-Hash Code ---");

            // 1. יצירת משתמש חדש עם הפרטים המבוקשים
            user testingUser = new user();
            testingUser.setFirstName("ישראל");
            testingUser.setLastName("ישראלי");
            testingUser.setPhone("0501234567");

            // שמירה ב-Neon (יוצר גם את העמודות החדשות ב-DB אוטומטית)
            userRepository.save(testingUser);

            // 2. קריאה לפונקציית ה-Hash שכתבנו
            int myHashCode = testingUser.generateRowHashCode();

            // 3. הדפסת הקוד לטרמינל
            System.out.println("קוד ה-Hash שנוצר עבור השורה הוא: " + myHashCode);




    }
}


