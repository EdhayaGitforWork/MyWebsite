package com.profile.mywebsite_backend.service;

import com.profile.mywebsite_backend.dto.EnquiryRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    private static final String TOPIC = "enquiries-topic";

    public void sendEnquiry(EnquiryRequest request) {
        log.info("Sending enquiry to Kafka topic '{}': {}", TOPIC, request.getEmail());
        kafkaTemplate.send(TOPIC, request);
    }
}
