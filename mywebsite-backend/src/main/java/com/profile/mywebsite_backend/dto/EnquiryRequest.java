package com.profile.mywebsite_backend.dto;

import java.util.List;
import lombok.Data;

@Data
public class EnquiryRequest {
    private String userName;
    private String email;
    private String mobileNo;
    private List<String> selectedServices;
    private String companyName;
    private Integer projectDuration;
    private String domain;
}
