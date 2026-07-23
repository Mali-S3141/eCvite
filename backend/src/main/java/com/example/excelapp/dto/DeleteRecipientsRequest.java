package com.example.excelapp.dto;

import lombok.Data;

import java.util.List;

@Data
public class DeleteRecipientsRequest {

    private String phone;

    private List<String> hashCodes;
}