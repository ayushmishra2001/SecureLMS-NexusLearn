package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import tech.csm.securelms.enums.SecurityEventType;

import java.time.LocalDateTime;

@Data
@Builder
public class SecurityAuditLogResponse {
    private Long id;
    private Long userId;
    private String fullName; // NOTE: ADD: firstName + lastName combined
    private String username;
    private String email; // NOTE: ADD
    private String role; // NOTE: ADD
    private SecurityEventType eventType;
    private String outcome;
    private String ipAddress;
    private String browser;
    private String contextInfo;
    private String details;
    private LocalDateTime createdAt;
}

