package com.example.excelapp.dto;

import com.example.excelapp.entity.Recipients;

import java.util.List;

public class SaveRecipientsRequest {

    private String phone;
    private List<Recipients> recipients;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public List<Recipients> getRecipients() {
        return recipients;
    }

    public void setRecipients(List<Recipients> recipients) {
        this.recipients = recipients;
    }
}