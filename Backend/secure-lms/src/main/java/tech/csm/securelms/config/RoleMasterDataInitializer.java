package tech.csm.securelms.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.RoleMaster;
import tech.csm.securelms.repository.RoleMasterRepository;

@Component
@RequiredArgsConstructor
@Order(1)
public class RoleMasterDataInitializer implements CommandLineRunner {

    private final RoleMasterRepository roleMasterRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seed(RoleCodes.SUPER_ADMIN, "Super Admin", "Global platform administration across all groups", 5);
        seed(RoleCodes.ADMIN, "Admin", "Full platform administration", 10);
        seed(RoleCodes.TRAINER, "Trainer", "Course and module management", 20);
        seed(RoleCodes.STUDENT, "Student", "Learner access", 30);
    }

    private void seed(String code, String displayName, String description, int sortOrder) {
        roleMasterRepository.findByCodeIgnoreCase(code).ifPresentOrElse(role -> {
            role.setDisplayName(displayName);
            role.setDescription(description);
            role.setActive(true);
            role.setSystemRole(true);
            role.setAssignable(true);
            role.setSortOrder(sortOrder);
        }, () -> roleMasterRepository.save(RoleMaster.builder()
                .code(code)
                .displayName(displayName)
                .description(description)
                .active(true)
                .systemRole(true)
                .assignable(true)
                .sortOrder(sortOrder)
                .build()));
    }
}
