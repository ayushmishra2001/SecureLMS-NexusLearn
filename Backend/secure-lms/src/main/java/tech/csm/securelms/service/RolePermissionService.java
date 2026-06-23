package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.RolePermissionSaveRequest;
import tech.csm.securelms.dto.request.UserPermissionEntryRequest;
import tech.csm.securelms.dto.response.PermissionFlagsResponse;
import tech.csm.securelms.dto.response.RolePermissionResponse;
import tech.csm.securelms.dto.response.UserPermissionFunctionRowResponse;
import tech.csm.securelms.dto.response.UserPermissionGlobalGroupResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.entity.FunctionLink;
import tech.csm.securelms.entity.PrimaryLink;
import tech.csm.securelms.entity.RoleMaster;
import tech.csm.securelms.entity.RolePermission;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.repository.FunctionLinkRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;
import tech.csm.securelms.repository.RolePermissionRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RolePermissionRepository rolePermissionRepository;
    private final FunctionLinkRepository functionLinkRepository;
    private final PrimaryLinkRepository primaryLinkRepository;
    private final tech.csm.securelms.repository.GroupPermissionRepository groupPermissionRepository;
    private final RoleMasterService roleMasterService;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse> getPaginatedRolePermissions(String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<tech.csm.securelms.entity.RolePermission> page = rolePermissionRepository.findAllBySearch(search, pageable);
        
        List<tech.csm.securelms.entity.PrimaryLink> primaryLinks = primaryLinkRepository.findAll();
        Map<Long, String> functionToGlobal = new HashMap<>();
        for (tech.csm.securelms.entity.PrimaryLink pl : primaryLinks) {
            functionToGlobal.put(pl.getFunctionLink().getId(), pl.getGlobalLink().getDisplayName());
        }

        return page.map(rp -> 
            tech.csm.securelms.dto.response.PermissionListResponse.builder()
                .id(rp.getId())
                .entityType("ROLE")
                .entityId(rp.getRole().getId())
                .entityName(rp.getRole().getDisplayName())
                .functionLinkId(rp.getFunctionLink().getId())
                .functionLinkName(rp.getFunctionLink().getDisplayName())
                .globalLinkName(functionToGlobal.getOrDefault(rp.getFunctionLink().getId(), "N/A"))
                .canView(rp.isCanView())
                .canAdd(rp.isCanAdd())
                .canManage(rp.isCanManage())
                .build()
        );
    }

    @Transactional
    public void deleteRolePermission(Long id) {
        rolePermissionRepository.deleteById(id);
        navbarCacheService.invalidateAll();
    }


    @Transactional(readOnly = true)
    public RolePermissionResponse getPermissionsForRole(Long roleId, tech.csm.securelms.security.UserPrincipal principal) {
        RoleMaster role = roleMasterService.findById(roleId);

        List<PrimaryLink> activePrimaryLinks = primaryLinkRepository.findAllActiveForNavbar();
        
        if (principal != null && !"SUPER_ADMIN".equals(principal.getRole()) && principal.getGroupId() != null) {
            Set<Long> groupAllowedFunctionIds = groupPermissionRepository.findByGroupId(principal.getGroupId()).stream()
                    .filter(gp -> gp.isCanView() || gp.isCanAdd() || gp.isCanManage())
                    .map(gp -> gp.getFunctionLink().getId())
                    .collect(Collectors.toSet());
            activePrimaryLinks = activePrimaryLinks.stream()
                    .filter(pl -> groupAllowedFunctionIds.contains(pl.getFunctionLink().getId()))
                    .collect(Collectors.toList());
        }

        Map<Long, RolePermission> permissionByFunctionId = rolePermissionRepository.findByRoleId(roleId).stream()
                .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity(), (a, b) -> a));

        Map<Long, UserPermissionGlobalGroupResponse> grouped = new LinkedHashMap<>();
        Map<Long, Set<Long>> seenFunctionPerGlobal = new HashMap<>();

        for (PrimaryLink primary : activePrimaryLinks) {
            Long globalId = primary.getGlobalLink().getId();
            Long functionId = primary.getFunctionLink().getId();

            UserPermissionGlobalGroupResponse group = grouped.computeIfAbsent(globalId, ignored -> UserPermissionGlobalGroupResponse
                    .builder()
                    .globalLinkId(globalId)
                    .globalLinkName(primary.getGlobalLink().getDisplayName())
                    .orderIndex(primary.getGlobalLink().getOrderIndex())
                    .functionLinks(new ArrayList<>())
                    .build());

            Set<Long> seenSet = seenFunctionPerGlobal.computeIfAbsent(globalId, ignored -> new HashSet<>());
            if (seenSet.contains(functionId)) {
                continue;
            }
            seenSet.add(functionId);

            RolePermission permission = permissionByFunctionId.get(functionId);
            group.getFunctionLinks().add(UserPermissionFunctionRowResponse.builder()
                    .functionLinkId(functionId)
                    .functionLinkName(primary.getFunctionLink().getDisplayName())
                    .permissions(PermissionFlagsResponse.builder()
                            .canView(permission != null && permission.isCanView())
                            .canAdd(permission != null && permission.isCanAdd())
                            .canManage(permission != null && permission.isCanManage())
                            .build())
                    .build());
        }

        return RolePermissionResponse.builder()
                .roleId(role.getId())
                .role(role.getCode())
                .roleName(role.getDisplayName())
                .globalLinks(new ArrayList<>(grouped.values()))
                .build();
    }

    @Transactional
    public UserPermissionSaveSummaryResponse savePermissions(Long roleId, RolePermissionSaveRequest request) {
        RoleMaster role = roleMasterService.findById(roleId);
        roleMasterService.ensureSuperAdminControl(role);

        List<Long> functionIds = request.getPermissions().stream()
                .map(UserPermissionEntryRequest::getFunctionLinkId)
                .distinct()
                .toList();
        List<FunctionLink> functionLinks = functionLinkRepository.findAllById(functionIds);
        if (functionLinks.size() != functionIds.size()) {
            throw new BadRequestException("One or more Function Links are invalid");
        }

        Map<Long, FunctionLink> functionById = functionLinks.stream()
                .collect(Collectors.toMap(FunctionLink::getId, Function.identity()));
        Map<Long, RolePermission> existingMap = rolePermissionRepository
                .findByRoleIdAndFunctionLinkIdIn(roleId, functionIds)
                .stream()
                .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity(), (a, b) -> a));

        int granted = 0;
        int revoked = 0;
        List<RolePermission> toSave = new ArrayList<>();

        for (UserPermissionEntryRequest rawEntry : request.getPermissions()) {
            PermissionFlags normalized = normalize(rawEntry.getCanView(), rawEntry.getCanAdd(), rawEntry.getCanManage());
            RolePermission entity = existingMap.get(rawEntry.getFunctionLinkId());

            if (entity == null) {
                entity = RolePermission.builder()
                        .role(role)
                        .functionLink(functionById.get(rawEntry.getFunctionLinkId()))
                        .canView(false)
                        .canAdd(false)
                        .canManage(false)
                        .build();
            }

            granted += changedBits(entity, normalized, true);
            revoked += changedBits(entity, normalized, false);
            entity.setCanView(normalized.canView());
            entity.setCanAdd(normalized.canAdd());
            entity.setCanManage(normalized.canManage());
            toSave.add(entity);
        }

        rolePermissionRepository.saveAll(toSave);
        navbarCacheService.invalidateAll();

        return UserPermissionSaveSummaryResponse.builder()
                .usersAffected(1)
                .grantedCount(granted)
                .revokedCount(revoked)
                .build();
    }

    private PermissionFlags normalize(boolean canView, boolean canAdd, boolean canManage) {
        boolean manage = canManage;
        boolean add = canAdd || manage;
        boolean view = canView || add;
        return new PermissionFlags(view, add, manage);
    }

    private int changedBits(RolePermission existing, PermissionFlags next, boolean toGranted) {
        int changes = 0;
        changes += changed(existing.isCanView(), next.canView(), toGranted) ? 1 : 0;
        changes += changed(existing.isCanAdd(), next.canAdd(), toGranted) ? 1 : 0;
        changes += changed(existing.isCanManage(), next.canManage(), toGranted) ? 1 : 0;
        return changes;
    }

    private boolean changed(boolean oldValue, boolean newValue, boolean toGranted) {
        return toGranted ? (!oldValue && newValue) : (oldValue && !newValue);
    }

    private record PermissionFlags(boolean canView, boolean canAdd, boolean canManage) {
    }
}
