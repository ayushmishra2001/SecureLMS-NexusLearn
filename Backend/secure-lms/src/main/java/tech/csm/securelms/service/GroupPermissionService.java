package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.GroupPermissionSaveRequest;
import tech.csm.securelms.dto.request.UserPermissionEntryRequest;
import tech.csm.securelms.dto.response.PermissionFlagsResponse;
import tech.csm.securelms.dto.response.GroupPermissionResponse;
import tech.csm.securelms.dto.response.UserPermissionFunctionRowResponse;
import tech.csm.securelms.dto.response.UserPermissionGlobalGroupResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.entity.FunctionLink;
import tech.csm.securelms.entity.PrimaryLink;
import tech.csm.securelms.entity.GroupMaster;
import tech.csm.securelms.entity.GroupPermission;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.repository.FunctionLinkRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;
import tech.csm.securelms.repository.GroupPermissionRepository;

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
public class GroupPermissionService {

    private final GroupPermissionRepository groupPermissionRepository;
    private final FunctionLinkRepository functionLinkRepository;
    private final PrimaryLinkRepository primaryLinkRepository;
    private final GroupMasterService groupMasterService;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse> getPaginatedGroupPermissions(String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<GroupPermission> page = groupPermissionRepository.findAllBySearch(search, pageable);
        
        List<PrimaryLink> primaryLinks = primaryLinkRepository.findAll();
        Map<Long, String> functionToGlobal = new HashMap<>();
        for (PrimaryLink pl : primaryLinks) {
            functionToGlobal.put(pl.getFunctionLink().getId(), pl.getGlobalLink().getDisplayName());
        }

        return page.map(gp -> 
            tech.csm.securelms.dto.response.PermissionListResponse.builder()
                .id(gp.getId())
                .entityType("GROUP")
                .entityId(gp.getGroup().getId())
                .entityName(gp.getGroup().getGroupName())
                .functionLinkId(gp.getFunctionLink().getId())
                .functionLinkName(gp.getFunctionLink().getDisplayName())
                .globalLinkName(functionToGlobal.getOrDefault(gp.getFunctionLink().getId(), "N/A"))
                .canView(gp.isCanView())
                .canAdd(gp.isCanAdd())
                .canManage(gp.isCanManage())
                .build()
        );
    }

    @Transactional
    public void deleteGroupPermission(Long id) {
        groupPermissionRepository.deleteById(id);
        navbarCacheService.invalidateAll();
    }

    @Transactional(readOnly = true)
    public GroupPermissionResponse getPermissionsForGroup(Long groupId, tech.csm.securelms.security.UserPrincipal principal) {
        GroupMaster group = groupMasterService.findById(groupId);

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

        Map<Long, GroupPermission> permissionByFunctionId = groupPermissionRepository.findByGroupId(groupId).stream()
                .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity(), (a, b) -> a));

        Map<Long, UserPermissionGlobalGroupResponse> grouped = new LinkedHashMap<>();
        Map<Long, Set<Long>> seenFunctionPerGlobal = new HashMap<>();

        for (PrimaryLink primary : activePrimaryLinks) {
            Long globalId = primary.getGlobalLink().getId();
            Long functionId = primary.getFunctionLink().getId();

            UserPermissionGlobalGroupResponse globalGroup = grouped.computeIfAbsent(globalId, ignored -> UserPermissionGlobalGroupResponse
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

            GroupPermission permission = permissionByFunctionId.get(functionId);
            globalGroup.getFunctionLinks().add(UserPermissionFunctionRowResponse.builder()
                    .functionLinkId(functionId)
                    .functionLinkName(primary.getFunctionLink().getDisplayName())
                    .permissions(PermissionFlagsResponse.builder()
                            .canView(permission != null && permission.isCanView())
                            .canAdd(permission != null && permission.isCanAdd())
                            .canManage(permission != null && permission.isCanManage())
                            .build())
                    .build());
        }

        return GroupPermissionResponse.builder()
                .groupId(group.getId())
                .groupName(group.getGroupName())
                .globalLinks(new ArrayList<>(grouped.values()))
                .build();
    }

    @Transactional
    public UserPermissionSaveSummaryResponse savePermissions(Long groupId, GroupPermissionSaveRequest request) {
        GroupMaster group = groupMasterService.findById(groupId);

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
        Map<Long, GroupPermission> existingMap = groupPermissionRepository
                .findByGroupIdAndFunctionLinkIdIn(groupId, functionIds)
                .stream()
                .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity(), (a, b) -> a));

        int granted = 0;
        int revoked = 0;
        List<GroupPermission> toSave = new ArrayList<>();

        for (UserPermissionEntryRequest rawEntry : request.getPermissions()) {
            PermissionFlags normalized = normalize(rawEntry.getCanView(), rawEntry.getCanAdd(), rawEntry.getCanManage());
            GroupPermission entity = existingMap.get(rawEntry.getFunctionLinkId());

            if (entity == null) {
                entity = GroupPermission.builder()
                        .group(group)
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

        groupPermissionRepository.saveAll(toSave);
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

    private int changedBits(GroupPermission existing, PermissionFlags next, boolean toGranted) {
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
