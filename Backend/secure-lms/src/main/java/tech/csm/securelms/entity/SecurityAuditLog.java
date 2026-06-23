package tech.csm.securelms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.csm.securelms.enums.SecurityEventType;

import java.time.LocalDateTime;

@Entity
@Table(name = "security_audit_logs", indexes = {
        @Index(name = "idx_sal_user_id", columnList = "user_id"),
        @Index(name = "idx_sal_event_type", columnList = "event_type"),
        @Index(name = "idx_sal_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "event_type", nullable = false, length = 64)
    private SecurityEventType eventType;

    @Column(name = "outcome", nullable = false, length = 16)
    private String outcome;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "browser", length = 100)
    private String browser;

    @Column(name = "context_info", length = 255)
    private String contextInfo;

    @Column(name = "details", length = 1000)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
