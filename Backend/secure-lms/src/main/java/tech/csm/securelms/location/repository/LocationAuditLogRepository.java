package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.LocationAuditLog;

import java.util.List;

@Repository
public interface LocationAuditLogRepository extends JpaRepository<LocationAuditLog, Long> {
    List<LocationAuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(String entityType, Long entityId);
    List<LocationAuditLog> findByEntityTypeOrderByPerformedAtDesc(String entityType);
}
