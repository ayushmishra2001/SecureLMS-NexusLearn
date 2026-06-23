package tech.csm.securelms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.GroupMaster;
import tech.csm.securelms.entity.RoleMaster;
import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.repository.RoleMasterRepository;

import java.util.HashSet;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class GroupDataInitializer implements CommandLineRunner {

    private final GroupMasterRepository groupMasterRepository;
    private final RoleMasterRepository roleMasterRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedGroup("System Administration", "Root group for super administrators and system management");
        
        GroupMaster pendingGroup = seedGroup("Pending Users", "Default group for new public registrations");
        
        // Map baseline roles to Pending Users
        RoleMaster studentRole = roleMasterRepository.findByCodeIgnoreCase(RoleCodes.STUDENT).orElse(null);
        if (studentRole != null && pendingGroup != null) {
            if (studentRole.getGroups() == null) {
                studentRole.setGroups(new HashSet<>());
            }
            if (!studentRole.getGroups().contains(pendingGroup)) {
                studentRole.getGroups().add(pendingGroup);
                roleMasterRepository.save(studentRole);
            }
        }
    }

    private GroupMaster seedGroup(String name, String desc) {
        return groupMasterRepository.findByGroupName(name)
                .orElseGet(() -> groupMasterRepository.save(GroupMaster.builder()
                        .groupName(name)
                        .description(desc)
                        .active(true)
                        .build()));
    }
}
