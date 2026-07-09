package com.example.excelapp.controller;
import com.example.excelapp.entity.user;
import com.example.excelapp.repository.UserRepository;
import org.springframework.web.bind.annotation.*;




    @RestController
    @RequestMapping("/api/recipients") // הכתובת הכללית של ה-API
    @CrossOrigin(origins = "*") // מאפשר לפרונט להתחבר לשרת ללא חסימות
    public class RecipientController {

        // הזרקת ה-Repository שקורא ל-database
        private final UserRepository userRepository;

        public RecipientController(UserRepository userRepository) {
            this.userRepository = userRepository;
        }

        /**
         * פונקציה להכנסת נתונים ושמירה בבסיס הנתונים
         * הפרונט ישלח בקשת POST לכתובת: http://localhost:8080/api/recipients/add
         */
        @PostMapping("/add")
        public user insertRecipient(@RequestBody user newRecipient) {

            // לפני השמירה, המערכת מייצרת אוטומטית את קוד ה-Hash לשורה
            int calculatedHash = newRecipient.generateRowHashCode();

            // הגדרת ה-HashCode שנוצר כמפתח (אם בחרת להמיר אותו לטקסט)


            // שמירת המשתמש בבסיס הנתונים (Neon) והחזרת האובייקט השמור
            return userRepository.save(newRecipient);
        }
    }


