package com.example.excelapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "excel_columns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcelColumn {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "technical_name", nullable = false)
    private String technicalName;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "is_required")
    private Boolean isRequired;

    @Column(name = "default_order")
    private Integer defaultOrder;

    @Column(name = "is_visible")
    private Boolean isVisible;

    // רשימת שמות מקבילים אפשריים, מופרדים בפסיקים (העמודה עצמה היא טקסט רגיל, לא מערך)
    @Column(name = "aliases")
    private String aliases;

    // ערכים אופייניים שיכולים להופיע בתוך התא עצמו (לא בכותרת) - למשל סיומות/קידומות
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "possible_values", columnDefinition = "text[]")
    private List<String> possibleValues;
}
