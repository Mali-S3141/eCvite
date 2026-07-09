package com.example.excelapp;

import com.example.excelapp.entity.recipients;
import com.example.excelapp.repository.RecipientsRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.util.List;


public class DatabaseDemoRunner implements CommandLineRunner {

    private final RecipientsRepository recipientsRepository; // נשאר רק ה-Repository של ה-recipients

    // קונסטרקטור המזריק רק את recipientsRepository
    public DatabaseDemoRunner(RecipientsRepository recipientsRepository) {
        this.recipientsRepository = recipientsRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- הרצת מערכת ניהול הנמענים ---");


        System.out.println("נמען חדש נשמר בהצלחה בבסיס הנתונים!");

        // 2. בדיקת פונקציית שליפת הנתונים (ממוינים לפי עיר)
        System.out.println("\n--- שליפת כל הנמענים ממוינים לפי עיר ---");
        List<recipients> allRecipients = getAllRecipientsSortedBy("city");
        allRecipients.forEach(r -> System.out.println(r.getMan() + " " + r.getLastName() + " - עיר: " + r.getCity()));
    }

    /**
     * פונקציה 1: הוספת נתונים (הכנסת נמען חדש ל-Database)
     */
    public recipients insertRecipient(String hashCode, String man, String woman, String lastName, String phone, String mail,
                                      String fatherName, String motherName, String country, String city, String street, String houseNo,
                                      String belongsTo, String prefix, String suffix, boolean changed, LocalDate changeDate,
                                      String changeBy, String createdBy, boolean print, String display) {

        recipients r = new recipients();
        r.setHashCode(hashCode);
        r.setMan(man);
        r.setWoman(woman);
        r.setLastName(lastName);
        r.setPhone(phone);
        r.setMail(mail);
        r.setFatherName(fatherName);
        r.setMotherName(motherName);
        r.setCountry(country);
        r.setCity(city);
        r.setStreet(street);
        r.setHouseNo(houseNo);
        r.setBelongsTo(belongsTo);
        r.setPrefix(prefix);
        r.setSuffix(suffix);
        r.setChanged(changed);
        r.setChangeDate(changeDate);
        r.setChangeBy(changeBy);
        r.setCreatedBy(createdBy);
        r.setPrint(print);
        r.setDisplay(display);

        // שמירה בטבלה והחזרת האובייקט השמור
        return recipientsRepository.save(r);
    }

    /**
     * פונקציה 2: שליפת נתונים ממוינים לפי שדה לבחירה
     * @param propertyName שם המשתנה במחלקת recipients (למשל: "lastName", "city")
     */
    public List<recipients> getAllRecipientsSortedBy(String propertyName) {
        // שליפת כל השורות מה-DB כשהן ממוינות בסדר עולה
        return recipientsRepository.findAll(Sort.by(Sort.Direction.ASC, propertyName));
    }
}
