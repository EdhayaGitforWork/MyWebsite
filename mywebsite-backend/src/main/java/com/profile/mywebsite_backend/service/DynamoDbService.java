package com.profile.mywebsite_backend.service;

import com.profile.mywebsite_backend.dto.EnquiryRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DynamoDbService {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.table-name}")
    private String tableName;

    public void saveEnquiry(EnquiryRequest request) {
        log.info("Persisting enquiry to DynamoDB table: {}", tableName);

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("enquiryId", AttributeValue.builder().s(UUID.randomUUID().toString()).build());
        item.put("userName", AttributeValue.builder().s(request.getUserName() != null ? request.getUserName() : "Unknown").build());
        item.put("email", AttributeValue.builder().s(request.getEmail() != null ? request.getEmail() : "Unknown").build());
        item.put("mobileNo", AttributeValue.builder().s(request.getMobileNo() != null ? request.getMobileNo() : "Unknown").build());
        item.put("domain", AttributeValue.builder().s(request.getDomain() != null ? request.getDomain() : "Other").build());
        item.put("timestamp", AttributeValue.builder().s(Instant.now().toString()).build());

        if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            item.put("companyName", AttributeValue.builder().s(request.getCompanyName()).build());
        }

        if (request.getProjectDuration() != null) {
            item.put("projectDuration", AttributeValue.builder().n(String.valueOf(request.getProjectDuration())).build());
        }

        if (request.getSelectedServices() != null && !request.getSelectedServices().isEmpty()) {
            item.put("selectedServices", AttributeValue.builder().l(
                    request.getSelectedServices().stream()
                            .map(s -> AttributeValue.builder().s(s).build())
                            .collect(Collectors.toList())
            ).build());
        }

        try {
            PutItemRequest putItemRequest = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build();

            PutItemResponse response = dynamoDbClient.putItem(putItemRequest);
            log.info("Successfully persisted enquiry to DynamoDB. HTTP Status: {}", response.sdkHttpResponse().statusCode());
        } catch (Exception e) {
            log.error("Failed to persist enquiry to DynamoDB", e);
            throw new RuntimeException("DynamoDB persistence failed", e);
        }
    }
}
