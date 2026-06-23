package tech.csm.securelms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        ensureBrowserColumn();
        ensureEventTypeAsVarchar();
    }

    private void ensureBrowserColumn() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_schema = DATABASE() "
                        + "AND table_name = 'security_audit_logs' "
                        + "AND column_name = 'browser'",
                Integer.class);

        if (count != null && count == 0) {
            jdbcTemplate.execute("ALTER TABLE security_audit_logs ADD COLUMN browser VARCHAR(100) NULL");
            log.info("Added missing column security_audit_logs.browser");
        }
    }

    private void ensureEventTypeAsVarchar() {
        String dataType = jdbcTemplate.queryForObject(
                "SELECT DATA_TYPE FROM information_schema.columns "
                        + "WHERE table_schema = DATABASE() "
                        + "AND table_name = 'security_audit_logs' "
                        + "AND column_name = 'event_type' "
                        + "LIMIT 1",
                String.class);

        if (dataType != null && !"varchar".equalsIgnoreCase(dataType)) {
            jdbcTemplate.execute("ALTER TABLE security_audit_logs MODIFY COLUMN event_type VARCHAR(64) NOT NULL");
            log.info("Updated security_audit_logs.event_type to VARCHAR(64)");
        }
    }
}

