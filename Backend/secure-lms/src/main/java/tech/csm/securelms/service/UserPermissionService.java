package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.UserPermissionEntryRequest;
import tech.csm.securelms.dto.request.UserPermissionSaveRequest;
import tech.csm.securelms.dto.response.PermissionFlagsResponse;
import tech.csm.securelms.dto.response.UserPermissionByUserResponse;
import tech.csm.securelms.dto.response.UserPermissionFunctionRowResponse;
import tech.csm.securelms.dto.response.UserPermissionGlobalGroupResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.dto.response.UserPermissionUserOptionResponse;
import tech.csm.securelms.entity.FunctionLink;
import tech.csm.securelms.entity.PrimaryLink;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.entity.UserPermission;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.FunctionLinkRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;
import tech.csm.securelms.repository.RolePermissionRepository;
import tech.csm.securelms.repository.UserPermissionRepository;
import tech.csm.securelms.repository.UserRepository;

import java.util.ArrayList;
import java.util.Collection;
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
public class UserPermissionService {

    private final UserPermissionRepository userPermissionRepository;
    private final UserRepository userRepository;
    private final FunctionLinkRepository functionLinkRepository;
    private final PrimaryLinkRepository primaryLinkRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final tech.csm.securelms.repository.GroupPermissionRepository groupPermissionRepository;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse> getPaginatedUserPermissions(String search, org.springframework.data.domain.Pageable pageable, tech.csm.securelms.security.UserPrincipal principal) {
        org.springframework.data.domain.Page<tech.csm.securelms.entity.UserPermission> page;
        if (principal != null && !"SUPER_ADMIN".equals(principal.getRole())) {
            Long groupId = principal.getGroupId() != null ? principal.getGroupId() : -1L;
            page = userPermissionRepository.findAllBySearchAndGroupId(search, groupId, pageable);
        } else {
            page = userPermissionRepository.findAllBySearch(search, pageable);
        }
        
        List<tech.csm.securelms.entity.PrimaryLink> primaryLinks = primaryLinkRepository.findAll();
        Map<Long, String> functionToGlobal = new HashMap<>();
        for (tech.csm.securelms.entity.PrimaryLink pl : primaryLinks) {
            functionToGlobal.put(pl.getFunctionLink().getId(), pl.getGlobalLink().getDisplayName());
        }

        return page.map(up -> 
            tech.csm.securelms.dto.response.PermissionListResponse.builder()
                .id(up.getId())
                .entityType("USER")
                .entityId(up.getUser().getId())
                .entityName(up.getUser().getUsername())
                .functionLinkId(up.getFunctionLink().getId())
                .functionLinkName(up.getFunctionLink().getDisplayName())
                .globalLinkName(functionToGlobal.getOrDefault(up.getFunctionLink().getId(), "N/A"))
                .canView(up.isCanView())
                .canAdd(up.isCanAdd())
                .canManage(up.isCanManage())
                .build()
        );
    }

    @Transactional
    public void deleteUserPermission(Long id) {
        userPermissionRepository.deleteById(id);
        navbarCacheService.invalidateAll();
    }


    @Transactional(readOnly = true)
    public UserPermissionByUserResponse getPermissionsForUser(Long userId, tech.csm.securelms.security.UserPrincipal principal) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<PrimaryLink> activePrimaryLinks = primaryLinkRepository.findAllActiveForNavbar();
        
        System.out.println("DEBUG getPermissionsForUser - principal: " + principal);
        if (principal != null) {
            System.out.println("DEBUG getPermissionsForUser - role: " + principal.getRole() + ", groupId: " + principal.getGroupId());
        }

        if (principal != null && !"SUPER_ADMIN".equals(principal.getRole()) && principal.getGroupId() != null) {
            Set<Long> groupAllowedFunctionIds = groupPermissionRepository.findByGroupId(principal.getGroupId()).stream()
                    .filter(gp -> gp.isCanView() || gp.isCanAdd() || gp.isCanManage())
                    .map(gp -> gp.getFunctionLink().getId())
                    .collect(Collectors.toSet());
            System.out.println("DEBUG getPermissionsForUser - allowed functions for group: " + groupAllowedFunctionIds);
            activePrimaryLinks = activePrimaryLinks.stream()
                    .filter(pl -> groupAllowedFunctionIds.contains(pl.getFunctionLink().getId()))
                    .collect(Collectors.toList());
        }

        Map<Long, UserPermission> permissionByFunctionId = userPermissionRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity(), (a, b) -> a));
                
        Map<Long, tech.csm.securelms.entity.RolePermission> rolePermissionByFunctionId = user.getRole() == null ? Map.of() :
                rolePermissionRepository.findByRoleId(user.getRole().getId()).stream()
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

            UserPermission up = permissionByFunctionId.get(functionId);
            tech.csm.securelms.entity.RolePermission rp = rolePermissionByFunctionId.get(functionId);
            
            boolean effView = up != null ? up.isCanView() : (rp != null && rp.isCanView());
            boolean effAdd = up != null ? up.isCanAdd() : (rp != null && rp.isCanAdd());
            boolean effManage = up != null ? up.isCanManage() : (rp != null && rp.isCanManage());

            group.getFunctionLinks().add(UserPermissionFunctionRowResponse.builder()
                    .functionLinkId(functionId)
                    .functionLinkName(primary.getFunctionLink().getDisplayName())
                    .permissions(PermissionFlagsResponse.builder()
                            .canView(effView)
                            .canAdd(effAdd)
                            .canManage(effManage)
                            .build())
                    .build());
        }

        return UserPermissionByUserResponse.builder()
                .userId(userId)
                .globalLinks(new ArrayList<>(grouped.values()))
                .build();
    }

    @Transactional
    public UserPermissionSaveSummaryResponse savePermissions(UserPermissionSaveRequest request) {
        List<Long> userIds = request.getUserIds().stream().distinct().toList();
        List<User> users = userRepository.findAllById(userIds);
        if (users.size() != userIds.size()) {
            throw new BadRequestException("One or more users are invalid");
        }

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
        Map<Long, User> userById = users.stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<UserPermission> existing = userPermissionRepository.findByUserIdIn(userIds);
        Map<String, UserPermission> existingMap = existing.stream()
                .collect(Collectors.toMap(
                        p -> key(p.getUser().getId(), p.getFunctionLink().getId()),
                        Function.identity(),
                        (a, b) -> a));

        int granted = 0;
        int revoked = 0;
        List<UserPermission> toSave = new ArrayList<>();
        List<UserPermission> toDelete = new ArrayList<>();

        for (Long userId : userIds) {
            User user = userById.get(userId);
            Map<Long, tech.csm.securelms.entity.RolePermission> rolePermMap = user.getRole() == null ? Map.of() :
                    rolePermissionRepository.findByRoleId(user.getRole().getId()).stream()
                            .collect(Collectors.toMap(p -> p.getFunctionLink().getId(), Function.identity()));

            for (UserPermissionEntryRequest rawEntry : request.getPermissions()) {
                PermissionFlags normalized = normalize(rawEntry.getCanView(), rawEntry.getCanAdd(), rawEntry.getCanManage());
                String key = key(userId, rawEntry.getFunctionLinkId());
                UserPermission entity = existingMap.get(key);
                tech.csm.securelms.entity.RolePermission rp = rolePermMap.get(rawEntry.getFunctionLinkId());
                
                boolean roleView = rp != null && rp.isCanView();
                boolean roleAdd = rp != null && rp.isCanAdd();
                boolean roleManage = rp != null && rp.isCanManage();

                boolean isOverride = normalized.canView() != roleView || 
                                     normalized.canAdd() != roleAdd || 
                                     normalized.canManage() != roleManage;

                if (isOverride) {
                    if (entity == null) {
                        entity = UserPermission.builder()
                                .user(user)
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
                } else {
                    // It perfectly matches the role permission. It's not an override.
                    // If an entity exists, we delete it to keep DB clean.
                    if (entity != null) {
                        toDelete.add(entity);
                    }
                }
            }
        }

        userPermissionRepository.saveAll(toSave);
        if (!toDelete.isEmpty()) {
            userPermissionRepository.deleteAllInBatch(toDelete);
        }
        navbarCacheService.invalidateAll();

        return UserPermissionSaveSummaryResponse.builder()
                .usersAffected(userIds.size())
                .grantedCount(granted)
                .revokedCount(revoked)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UserPermissionUserOptionResponse> listUsers(String q, List<Long> groupIds, List<Long> roleIds, tech.csm.securelms.security.UserPrincipal principal) {
        List<Long> effectiveGroupIds = new ArrayList<>();
        if (principal != null && !"SUPER_ADMIN".equals(principal.getRole())) {
            if (principal.getGroupId() != null) {
                effectiveGroupIds.add(principal.getGroupId());
            } else {
                effectiveGroupIds.add(-1L);
            }
        } else if (groupIds != null && !groupIds.isEmpty()) {
            effectiveGroupIds.addAll(groupIds);
        }

        boolean filterByGroups = !effectiveGroupIds.isEmpty();
        boolean filterByRoles = roleIds != null && !roleIds.isEmpty();
        List<User> users = userRepository.searchUsersForPermissionMapping(
                q == null ? null : q.trim(),
                filterByGroups,
                filterByGroups ? effectiveGroupIds : List.of(-1L),
                filterByRoles,
                filterByRoles ? roleIds : List.of(-1L)
        );
        if (users.isEmpty()) {
            return List.of();
        }

        Collection<Long> userIds = users.stream().map(User::getId).toList();
        Set<Long> usersWithAnyMapping = userPermissionRepository.findByUserIdIn(userIds).stream()
                .map(p -> p.getUser().getId())
                .collect(Collectors.toSet());

        return users.stream()
                .map(user -> UserPermissionUserOptionResponse.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .fullName(buildFullName(user))
                        .hasPermissions(usersWithAnyMapping.contains(user.getId()))
                        .build())
                .toList();
    }

    private String buildFullName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? user.getUsername() : full;
    }

    private PermissionFlags normalize(boolean canView, boolean canAdd, boolean canManage) {
        boolean manage = canManage;
        boolean add = canAdd || manage;
        boolean view = canView || add;
        return new PermissionFlags(view, add, manage);
    }

    private int changedBits(UserPermission existing, PermissionFlags next, boolean toGranted) {
        int changes = 0;
        changes += changed(existing.isCanView(), next.canView(), toGranted) ? 1 : 0;
        changes += changed(existing.isCanAdd(), next.canAdd(), toGranted) ? 1 : 0;
        changes += changed(existing.isCanManage(), next.canManage(), toGranted) ? 1 : 0;
        return changes;
    }

    private boolean changed(boolean oldValue, boolean newValue, boolean toGranted) {
        return toGranted ? (!oldValue && newValue) : (oldValue && !newValue);
    }

    private String key(Long userId, Long functionId) {
        return userId + ":" + functionId;
    }

    private record PermissionFlags(boolean canView, boolean canAdd, boolean canManage) {
    }
}
