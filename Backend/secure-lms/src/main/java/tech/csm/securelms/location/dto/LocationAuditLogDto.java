package tech.csm.securelms.location.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationAuditLogDto {
    private Long auditId;
    private String entityType;
    private Long entityId;
    private String action;
    private String oldValue;
    private String newValue;
    private String performedBy;
    private LocalDateTime performedAt;
}
