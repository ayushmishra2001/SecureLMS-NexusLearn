package tech.csm.securelms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email_hash", columnList = "email_hash"),
        @Index(name = "idx_user_username", columnList = "username")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /**
     * Plain email stored in database.
     * Will be AES-256-GCM encrypted when sent between internal services.
     */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     * HMAC-SHA256 of the normalised email (lowercase, trimmed).
     * Used for all database lookups - deterministic, one-way.
     */
    @Column(name = "email_hash", nullable = false, unique = true, length = 64)
    private String emailHash;

    @Column(nullable = false)
    private String password;

    @Column(nullable = true, length = 50)
    private String firstName;

    @Column(nullable = true, length = 50)
    private String lastName;

    @Column(nullable = true, length = 15)
    private String contactNumber;

    @Column(nullable = true, unique = true, length = 12)
    private String aadharNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleMaster role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private GroupMaster group;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean accountNonLocked = true;

    @Column(nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(nullable = false)
    @Builder.Default
    private int lockoutLevel = 0;

    @Column
    private LocalDateTime lockedUntil;

    @OneToMany(mappedBy = "createdBy", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<Course> createdCourses = new ArrayList<>();

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<Enrollment> enrollments = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<UserPermission> permissions = new ArrayList<>();

    @PrePersist
    void setPasswordBaselineIfMissing() {
        if (passwordChangedAt == null) {
            passwordChangedAt = LocalDateTime.now();
        }
    }
}

