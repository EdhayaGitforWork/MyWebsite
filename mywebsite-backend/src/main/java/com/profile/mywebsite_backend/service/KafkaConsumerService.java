package com.profile.mywebsite_backend.service;

import com.profile.mywebsite_backend.dto.EnquiryRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final DynamoDbService dynamoDbService;

    // Banking and Fintech domains allowed for DynamoDB persistence
    private static final List<String> ALLOWED_DOMAINS = List.of("banking", "fintech");

    @KafkaListener(topics = "enquiry-events", groupId = "enquiry-group")
    public void consumeEnquiry(EnquiryRequest enquiry) {
        log.info("Received enquiry event from Kafka: {}", enquiry);

        String domain = enquiry.getDomain();
        if (domain != null && ALLOWED_DOMAINS.contains(domain.trim().toLowerCase())) {
            log.info("Domain '{}' matches allowed list (Banking/Fintech). Routing to DynamoDB...", domain);
            try {
                dynamoDbService.saveEnquiry(enquiry);
            } catch (Exception e) {
                log.error("Failed to save enquiry to DynamoDB", e);
            }
        } else {
            log.info("Domain '{}' is not Banking or Fintech. Skipping DynamoDB persistence.", domain);
        }
    }
}
