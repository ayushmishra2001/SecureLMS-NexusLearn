package tech.csm.securelms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.service.AesEncryptionService;
import tech.csm.securelms.service.RoleMasterService;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3)
public class SuperAdminDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleMasterService roleMasterService;
    private final PasswordEncoder passwordEncoder;
    private final AesEncryptionService aesEncryptionService;
    private final GroupMasterRepository groupMasterRepository;

    @Override
    @Transactional
    public void run(String... args) {
        String superAdminUsername = "superadmin";
        String superAdminEmail = "superadmin@securelms.com";

        if (!userRepository.existsByUsername(superAdminUsername)) {
            String normalised = superAdminEmail.toLowerCase().trim();
            String emailHash = aesEncryptionService.hashEmail(normalised);

            User superAdmin = User.builder()
                    .username(superAdminUsername)
                    .email(normalised)
                    .emailHash(emailHash)
                    .password(passwordEncoder.encode("Superadmin@123"))
                    .firstName("Super")
                    .lastName("Admin")
                    .contactNumber("9999999999")
                    .aadharNumber("000000000000")
                    .role(roleMasterService.findAssignableActiveByCode(RoleCodes.SUPER_ADMIN))
                    .active(true)
                    .accountNonLocked(true)
                    .group(groupMasterRepository.findByGroupName("System Administration").orElse(null))
                    .build();

            userRepository.save(superAdmin);
            log.info("Default Super Admin created: {} / Superadmin@123", superAdminUsername);
        }
    }
}
