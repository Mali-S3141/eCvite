package com.example.excelapp.service;

import com.example.excelapp.entity.Recipients;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelService {

    public List<Recipients> readExcel(MultipartFile file, String userHashCode) throws IOException {

        List<Recipients> recipientsList = new ArrayList<>();

        Workbook workbook =
                WorkbookFactory.create(file.getInputStream());

        Sheet sheet = workbook.getSheetAt(0);


        for (Row row : sheet) {

            // דילוג על שורת הכותרות
            if (row.getRowNum() == 0) {
                continue;
            }

            Recipients recipient = new Recipients();

            recipient.setMan(
                    row.getCell(0).getStringCellValue()
            );

            recipient.setWoman(
                    row.getCell(1).getStringCellValue()
            );

            recipient.setLastName(
                    row.getCell(2).getStringCellValue()
            );

            recipient.setPhone(
                    row.getCell(3).getStringCellValue()
            );


            recipientsList.add(recipient);
        }


        workbook.close();

        return recipientsList;
    }
}

