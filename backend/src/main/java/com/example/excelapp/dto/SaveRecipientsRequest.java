package com.example.excelapp.dto;



import com.example.excelapp.entity.Recipients;
import lombok.Data;

import java.util.List;

@Data
public class SaveRecipientsRequest {

    private String phone;

    private List<Recipients> recipients;
}
