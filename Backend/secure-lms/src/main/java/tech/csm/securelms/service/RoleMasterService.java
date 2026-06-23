package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.RoleMasterRequest;
import tech.csm.securelms.dto.response.RoleMasterResponse;
import tech.csm.securelms.entity.RoleMaster;
import tech.csm.securelms.entity.RolePermission;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.RoleMasterRepository;
import tech.csm.securelms.repository.RolePermissionRepository;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.entity.GroupMaster;
import java.util.HashSet;
import java.util.Set;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.constants.RoleCodes;

@Service
@RequiredArgsConstructor
public class RoleMasterService {

    private final RoleMasterRepository roleMasterRepository;
    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final GroupMasterRepository groupMasterRepository;

    @Transactional(readOnly = true)
    public List<RoleMasterResponse> list(boolean includeInactive, boolean assignableOnly, UserPrincipal principal, List<Long> groupIds) {
        List<RoleMaster> roles;
        
        if (groupIds != null && !groupIds.isEmpty()) {
            roles = assignableOnly
                    ? roleMasterRepository.findByGroupIdsAndAssignableTrueAndActiveTrue(groupIds)
                    : roleMasterRepository.findByGroupIdsAndActiveTrue(groupIds);
        } else if (principal == null || RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
            roles = assignableOnly
                    ? roleMasterRepository.findByAssignableTrueAndActiveTrueOrderBySortOrderAscDisplayNameAsc()
                    : includeInactive
                            ? roleMasterRepository.findAllByOrderBySortOrderAscDisplayNameAsc()
                            : roleMasterRepository.findByActiveTrueOrderBySortOrderAscDisplayNameAsc();
        } else {
            Long groupId = principal.getGroupId();
            if (groupId != null) {
                roles = assignableOnly
                        ? roleMasterRepository.findByGroupIdAndAssignableTrueAndActiveTrue(groupId)
                        : roleMasterRepository.findByGroupIdAndActiveTrue(groupId);
            } else {
                // If user is not SUPER_ADMIN and has no group, they see no roles, or only assignable roles?
                // Keeping existing behavior: if no group, use the same as SUPER_ADMIN but without inactive.
                roles = assignableOnly
                        ? roleMasterRepository.findByAssignableTrueAndActiveTrueOrderBySortOrderAscDisplayNameAsc()
                        : roleMasterRepository.findByActiveTrueOrderBySortOrderAscDisplayNameAsc();
            }
        }
        return roles.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleMasterResponse> getRolesForGroup(Long groupId) {
        return roleMasterRepository.findByGroupIdAndAssignableTrueAndActiveTrue(groupId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleMasterResponse> getRolesForNoneGroup() {
        return roleMasterRepository.findByCodeIgnoreCase(RoleCodes.STUDENT)
                .stream()
                .filter(RoleMaster::isActive)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoleMasterResponse get(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public RoleMasterResponse create(RoleMasterRequest request) {
        String code = normalizeCode(request.getCode());
        if (roleMasterRepository.existsByCodeIgnoreCase(code)) {
            throw new BadRequestException("Role code '" + code + "' already exists");
        }

        Set<GroupMaster> groups = new HashSet<>();
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = false;
        Long adminGroupId = null;
        if (auth != null && auth.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal principal) {
            isSuperAdmin = tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN.equalsIgnoreCase(principal.getRole());
            adminGroupId = principal.getGroupId();
        }

        if (!isSuperAdmin && adminGroupId != null) {
            groups.add(groupMasterRepository.findById(adminGroupId)
                    .orElseThrow(() -> new BadRequestException("Admin's group not found")));
        } else if (request.getGroupIds() != null && !request.getGroupIds().isEmpty()) {
            groups.addAll(groupMasterRepository.findAllById(request.getGroupIds()));
        }
        RoleMaster role = RoleMaster.builder()
                .code(code)
                .displayName(request.getDisplayName())
                .description(trimToNull(request.getDescription()))
                .active(request.getActive() == null || request.getActive())
                .assignable(request.getAssignable() == null || request.getAssignable())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .systemRole(false)
                .groups(groups)
                .build();
        RoleMaster savedRole = roleMasterRepository.save(role);
        clonePermissionsIfRequested(savedRole, request.getClonePermissionsFromRoleId());
        return toResponse(savedRole);
    }

    @Transactional
    public RoleMasterResponse update(Long id, RoleMasterRequest request) {
        RoleMaster role = findById(id);
        ensureSuperAdminControl(role);
        String code = normalizeCode(request.getCode());
        if (!role.isSystemRole() && !role.getCode().equals(code)) {
            if (roleMasterRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
                throw new BadRequestException("Role code '" + code + "' already exists");
            }
            role.setCode(code);
        } else if (role.isSystemRole() && !role.getCode().equals(code)) {
            throw new BadRequestException("System role codes cannot be changed");
        }

        role.setDisplayName(request.getDisplayName());
        role.setDescription(trimToNull(request.getDescription()));
        role.setAssignable(request.getAssignable() == null || request.getAssignable());
        role.setSortOrder(request.getSortOrder() == null ? role.getSortOrder() : request.getSortOrder());
        if (request.getActive() != null) {
            role.setActive(request.getActive());
        }
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isSuperAdmin = false;
        if (auth != null && auth.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal principal) {
            isSuperAdmin = tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN.equalsIgnoreCase(principal.getRole());
        }

        if (isSuperAdmin) {
            if (request.getGroupIds() != null) {
                Set<GroupMaster> groups = new HashSet<>(groupMasterRepository.findAllById(request.getGroupIds()));
                role.setGroups(groups);
            }
        }
        // If not SUPER_ADMIN, we leave the role's groups unmodified.
        return toResponse(roleMasterRepository.save(role));
    }

    @Transactional
    public RoleMasterResponse setActive(Long id, boolean active) {
        RoleMaster role = findById(id);
        ensureSuperAdminControl(role);
        if (!active && userRepository.countByRole_Id(id) > 0) {
            throw new BadRequestException("Cannot deactivate a role assigned to users");
        }
        role.setActive(active);
        return toResponse(roleMasterRepository.save(role));
    }

    @Transactional
    public void delete(Long id) {
        RoleMaster role = findById(id);
        ensureSuperAdminControl(role);
        if (role.isSystemRole()) {
            throw new BadRequestException("System roles cannot be deleted");
        }
        if (userRepository.countByRole_Id(id) > 0) {
            throw new BadRequestException("Cannot delete a role assigned to users");
        }
        List<RolePermission> perms = rolePermissionRepository.findByRoleId(id);
        boolean hasActivePermissions = perms.stream().anyMatch(p -> p.isCanView() || p.isCanAdd() || p.isCanManage());
        if (hasActivePermissions) {
            throw new BadRequestException("Remove role permissions before deleting this role");
        }
        if (!perms.isEmpty()) {
            rolePermissionRepository.deleteAll(perms);
        }
        roleMasterRepository.delete(role);
    }

    @Transactional(readOnly = true)
    public RoleMaster findAssignableActiveByCode(String code) {
        RoleMaster role = findActiveByCode(code);
        if (!role.isAssignable()) {
            throw new BadRequestException("Role '" + role.getCode() + "' is not assignable");
        }
        return role;
    }

    @Transactional(readOnly = true)
    public RoleMaster findActiveByCode(String code) {
        RoleMaster role = roleMasterRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new BadRequestException("Invalid role selected"));
        if (!role.isActive()) {
            throw new BadRequestException("Selected role is inactive");
        }
        return role;
    }

    @Transactional(readOnly = true)
    public RoleMaster findById(Long id) {
        return roleMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
    }

    public String roleCode(RoleMaster role) {
        return role != null ? role.getCode() : null;
    }

    public boolean hasRole(RoleMaster role, String code) {
        return role != null && role.getCode() != null && role.getCode().equalsIgnoreCase(code);
    }

    public RoleMasterResponse toResponse(RoleMaster role) {
        return RoleMasterResponse.builder()
                .id(role.getId())
                .code(role.getCode())
                .displayName(role.getDisplayName())
                .description(role.getDescription())
                .active(role.isActive())
                .systemRole(role.isSystemRole())
                .assignable(role.isAssignable())
                .sortOrder(role.getSortOrder())
                .userCount(role.getId() == null ? 0 : userRepository.countByRole_Id(role.getId()))
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .groupIds(role.getGroups() != null ? role.getGroups().stream().map(GroupMaster::getId).toList() : List.of())
                .build();
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Role code is required");
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void clonePermissionsIfRequested(RoleMaster targetRole, Long sourceRoleId) {
        if (sourceRoleId == null) {
            return;
        }
        if (sourceRoleId.equals(targetRole.getId())) {
            throw new BadRequestException("Cannot clone permissions from the same role");
        }

        RoleMaster sourceRole = findById(sourceRoleId);
        List<RolePermission> sourcePermissions = rolePermissionRepository.findByRoleId(sourceRole.getId());
        if (sourcePermissions.isEmpty()) {
            return;
        }

        List<RolePermission> clonedPermissions = new ArrayList<>();
        for (RolePermission source : sourcePermissions) {
            clonedPermissions.add(RolePermission.builder()
                    .role(targetRole)
                    .functionLink(source.getFunctionLink())
                    .canView(source.isCanView())
                    .canAdd(source.isCanAdd())
                    .canManage(source.isCanManage())
                    .build());
        }
        rolePermissionRepository.saveAll(clonedPermissions);
    }
    public void ensureSuperAdminControl(RoleMaster role) {
        if (tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN.equalsIgnoreCase(role.getCode())) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal principal) {
                if (!tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN.equalsIgnoreCase(principal.getRole())) {
                    throw new BadRequestException("You do not have permission to modify the Super Admin role");
                }
            }
        }
    }
}


