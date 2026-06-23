package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.response.PageResponse;
import tech.csm.securelms.dto.response.SecurityAuditLogResponse;
import tech.csm.securelms.entity.SecurityAuditLog;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.repository.SecurityAuditLogRepository;
import tech.csm.securelms.security.UserPrincipal;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    private final SecurityAuditLogRepository securityAuditLogRepository;
    private final RoleMasterService roleMasterService;

    @Transactional
    public void logEvent(User user, SecurityEventType eventType, String outcome,
            String ipAddress, String contextInfo, String details) {
        logEvent(user, eventType, outcome, ipAddress, null, contextInfo, details);
    }

    @Transactional
    public void logEvent(User user, SecurityEventType eventType, String outcome,
            String ipAddress, String browser, String contextInfo, String details) {
        SecurityAuditLog log = SecurityAuditLog.builder()
                .user(user)
                .eventType(eventType)
                .outcome(outcome)
                .ipAddress(ipAddress)
                .browser(browser)
                .contextInfo(contextInfo)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        securityAuditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<SecurityAuditLogResponse> getSecurityEvents(int page, int size, UserPrincipal principal) {
        return getSecurityEvents(page, size, null, null, null, null, null, null, null, null, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<SecurityAuditLogResponse> getRegistrationEvents(int page, int size, UserPrincipal principal) {
        return getSecurityEvents(page, size, List.of(SecurityEventType.USER_REGISTERED),
                null, null, null, null, null, null, null, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<SecurityAuditLogResponse> getLoginEvents(int page, int size, UserPrincipal principal) {
        return getSecurityEvents(page, size,
                List.of(SecurityEventType.LOGIN_SUCCESS, SecurityEventType.LOGIN_FAILED, SecurityEventType.LOGOUT),
                null, null, null, null, null, null, null, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<SecurityAuditLogResponse> getUserAuditEvents(Long userId, int page, int size, UserPrincipal principal) {
        return getSecurityEvents(page, size, null, null, null, null, userId, null, null, null, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<SecurityAuditLogResponse> getSecurityEvents(
            int page,
            int size,
            List<SecurityEventType> scopedEventTypes,
            SecurityEventType eventType,
            String outcome,
            String role,
            Long userId,
            String q,
            LocalDate fromDate,
            LocalDate toDate,
            UserPrincipal principal) {

        Specification<SecurityAuditLog> spec = buildAuditSpec(
                scopedEventTypes, eventType, outcome, role, userId, q, fromDate, toDate, principal);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SecurityAuditLog> result = securityAuditLogRepository.findAll(spec, pageable);

        return PageResponse.from(result.map(this::toResponse));
    }

    // For export, we want to return all matching records without pagination
    @Transactional(readOnly = true)
    public List<SecurityAuditLogResponse> getAllSecurityEventsForExport(
            List<SecurityEventType> scopedEventTypes,
            SecurityEventType eventType,
            String outcome,
            String role,
            Long userId,
            String q,
            LocalDate fromDate,
            LocalDate toDate,
            UserPrincipal principal) {

        Specification<SecurityAuditLog> spec = buildAuditSpec(
                scopedEventTypes, eventType, outcome, role, userId, q, fromDate, toDate, principal);

        return securityAuditLogRepository
                .findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    private Specification<SecurityAuditLog> buildAuditSpec(
            List<SecurityEventType> scopedEventTypes,
            SecurityEventType eventType,
            String outcome,
            String role,
            Long userId,
            String q,
            LocalDate fromDate,
            LocalDate toDate,
            UserPrincipal principal) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            Join<SecurityAuditLog, User> userJoin = root.join("user", JoinType.LEFT);
            
            if (principal != null && !tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
                if (principal.getGroupId() == null) {
                    predicates.add(cb.isNull(userJoin.get("group").get("id")));
                } else {
                    predicates.add(cb.equal(userJoin.get("group").get("id"), principal.getGroupId()));
                }
            }

            if (scopedEventTypes != null && !scopedEventTypes.isEmpty()) {
                predicates.add(root.get("eventType").in(scopedEventTypes));
            }
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (outcome != null && !outcome.isBlank()) {
                predicates.add(cb.equal(root.get("outcome"), outcome.trim().toUpperCase(Locale.ROOT)));
            }
            if (role != null && !role.isBlank()) {
                predicates.add(cb.equal(cb.upper(userJoin.get("role").get("code")), role.trim().toUpperCase(Locale.ROOT)));
            }
            if (userId != null) {
                predicates.add(cb.equal(userJoin.get("id"), userId));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate.atStartOfDay()));
            }
            if (toDate != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), toDate.plusDays(1).atStartOfDay()));
            }
            if (q != null && !q.isBlank()) {
                String search = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(userJoin.get("username"), "")), search),
                        cb.like(cb.lower(cb.coalesce(userJoin.get("email"), "")), search),
                        cb.like(cb.lower(cb.coalesce(userJoin.get("firstName"), "")), search),
                        cb.like(cb.lower(cb.coalesce(userJoin.get("lastName"), "")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("ipAddress"), "")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("browser"), "")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("contextInfo"), "")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("details"), "")), search),
                        cb.like(cb.lower(root.get("eventType").as(String.class)), search)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private SecurityAuditLogResponse toResponse(SecurityAuditLog log) {
        User user = log.getUser();
        String fullName = null;
        String email = null;
        String role = null;

        if (user != null) {
            String fn = user.getFirstName() != null ? user.getFirstName() : "";
            String ln = user.getLastName() != null ? user.getLastName() : "";
            fullName = (fn + " " + ln).trim();
            email = user.getEmail();
            role = roleMasterService.roleCode(user.getRole());
        }

        return SecurityAuditLogResponse.builder()
                .id(log.getId())
                .userId(user != null ? user.getId() : null)
                .fullName(fullName)
                .username(user != null ? user.getUsername() : null)
                .email(email)
                .role(role)
                .eventType(log.getEventType())
                .outcome(log.getOutcome())
                .ipAddress(log.getIpAddress())
                .browser(log.getBrowser())
                .contextInfo(log.getContextInfo())
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
