package tech.csm.securelms.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.SecurityAuditLog;
import tech.csm.securelms.enums.SecurityEventType;

import java.util.List;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, Long>,
                JpaSpecificationExecutor<SecurityAuditLog> {

        void deleteByUser_Id(Long userId);

        @Query("SELECT s FROM SecurityAuditLog s LEFT JOIN FETCH s.user ORDER BY s.createdAt DESC")
        Page<SecurityAuditLog> findAllWithUser(Pageable pageable);

        @Query("SELECT s FROM SecurityAuditLog s LEFT JOIN FETCH s.user WHERE s.eventType = :eventType ORDER BY s.createdAt DESC")
        Page<SecurityAuditLog> findByEventTypeWithUser(SecurityEventType eventType, Pageable pageable);

        @Query("SELECT s FROM SecurityAuditLog s LEFT JOIN FETCH s.user WHERE s.eventType IN :types ORDER BY s.createdAt DESC")
        Page<SecurityAuditLog> findByEventTypeInWithUser(List<SecurityEventType> types, Pageable pageable);

        @Query("SELECT s FROM SecurityAuditLog s LEFT JOIN FETCH s.user WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
        Page<SecurityAuditLog> findByUserIdWithUser(Long userId, Pageable pageable);
}
