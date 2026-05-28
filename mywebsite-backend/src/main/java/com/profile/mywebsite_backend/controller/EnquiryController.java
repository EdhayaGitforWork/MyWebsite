package com.profile.mywebsite_backend.controller;

import com.profile.mywebsite_backend.dto.EnquiryRequest;
import com.profile.mywebsite_backend.service.KafkaProducerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.Map;

@RestController
@RequestMapping("/api/enquiries")
@RequiredArgsConstructor
public class EnquiryController {

    private final KafkaProducerService kafkaProducerService;

    @PostMapping
    public ResponseEntity<?> submitEnquiry(@RequestBody EnquiryRequest request) {
        kafkaProducerService.sendEnquiry(request);
        return ResponseEntity.ok(Map.of("message", "Enquiry received and queued for processing"));
    }
}
