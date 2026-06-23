package tech.csm.securelms.service;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.response.NavbarFunctionGroupResponse;
import tech.csm.securelms.dto.response.NavbarFunctionLinkInfoResponse;
import tech.csm.securelms.dto.response.NavbarGlobalGroupResponse;
import tech.csm.securelms.dto.response.NavbarGlobalLinkInfoResponse;
import tech.csm.securelms.dto.response.NavbarPrimaryLinkResponse;
import tech.csm.securelms.dto.response.PermissionFlagsResponse;
import tech.csm.securelms.entity.PrimaryLink;
import tech.csm.securelms.entity.RolePermission;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.entity.UserPermission;
import tech.csm.securelms.entity.GroupPermission;
import tech.csm.securelms.repository.GroupPermissionRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;
import tech.csm.securelms.repository.RolePermissionRepository;
import tech.csm.securelms.repository.UserPermissionRepository;
import tech.csm.securelms.repository.UserRepository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
// import java.util.function.Function;
// import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NavbarService {

    private static final String MENU_CACHE_KEY = "navbar_menu_data";
    private static final String MENU_CACHE_VERSION_KEY = "navbar_menu_version";

    private final PrimaryLinkRepository primaryLinkRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final GroupPermissionRepository groupPermissionRepository;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public List<NavbarGlobalGroupResponse> getMenuForUser(Long userId, HttpSession session) {
        long currentVersion = navbarCacheService.currentVersion();
        Object cachedVersion = session.getAttribute(MENU_CACHE_VERSION_KEY);
        Object cachedData = session.getAttribute(MENU_CACHE_KEY);
        if (cachedVersion instanceof Long version && version == currentVersion && cachedData instanceof List<?>) {
            @SuppressWarnings("unchecked")
            List<NavbarGlobalGroupResponse> menu = (List<NavbarGlobalGroupResponse>) cachedData;
            return menu;
        }

        User user = userRepository.findById(userId).orElse(null);

        Map<Long, PermissionBits> visiblePermissionByFunction = new LinkedHashMap<>();
        boolean isSuperAdmin = user != null && user.getRole() != null && "SUPER_ADMIN".equalsIgnoreCase(user.getRole().getCode());

        if (isSuperAdmin) {
            primaryLinkRepository.findAllActiveForNavbar().forEach(pl -> {
                visiblePermissionByFunction.put(pl.getFunctionLink().getId(), new PermissionBits(true, true, true));
            });
        } else if (user != null && user.getRole() != null) {
            List<RolePermission> rolePerms = rolePermissionRepository.findByRoleId(user.getRole().getId());
            List<GroupPermission> groupPerms = user.getGroup() != null ? groupPermissionRepository.findByGroupId(user.getGroup().getId()) : List.of();

            rolePerms.forEach(rp -> {
                boolean view = rp.isCanView();
                boolean add = rp.isCanAdd();
                boolean manage = rp.isCanManage();

                if (user.getGroup() != null) {
                    GroupPermission gp = groupPerms.stream()
                            .filter(p -> p.getFunctionLink().getId().equals(rp.getFunctionLink().getId()))
                            .findFirst().orElse(null);
                    if (gp != null) {
                        view = view && gp.isCanView();
                        add = add && gp.isCanAdd();
                        manage = manage && gp.isCanManage();
                    } else {
                        view = false; add = false; manage = false;
                    }
                }

                if (view) {
                    visiblePermissionByFunction.put(rp.getFunctionLink().getId(), new PermissionBits(view, add, manage));
                }
            });
        }

        if (!isSuperAdmin) {
            List<UserPermission> allPermissions = userPermissionRepository.findByUserId(userId);
            allPermissions.forEach(permission -> {
                if (permission.isCanView()) {
                    visiblePermissionByFunction.put(permission.getFunctionLink().getId(),
                            new PermissionBits(permission.isCanView(), permission.isCanAdd(), permission.isCanManage()));
                } else {
                    visiblePermissionByFunction.remove(permission.getFunctionLink().getId());
                }
            });
        }

        if (visiblePermissionByFunction.isEmpty()) {
            session.setAttribute(MENU_CACHE_VERSION_KEY, currentVersion);
            session.setAttribute(MENU_CACHE_KEY, List.of());
            return List.of();
        }

        List<PrimaryLink> primaryLinks = primaryLinkRepository.findAllActiveForNavbar();
        Map<Long, GlobalBucket> globalBuckets = new LinkedHashMap<>();

        for (PrimaryLink primary : primaryLinks) {
            Long functionId = primary.getFunctionLink().getId();
            PermissionBits permission = visiblePermissionByFunction.get(functionId);
            if (permission == null || !permission.canView()) {
                continue;
            }

            Long globalId = primary.getGlobalLink().getId();
            GlobalBucket globalBucket = globalBuckets.computeIfAbsent(globalId, ignored -> new GlobalBucket(
                    NavbarGlobalLinkInfoResponse.builder()
                            .id(primary.getGlobalLink().getId())
                            .displayName(primary.getGlobalLink().getDisplayName())
                            .orderIndex(primary.getGlobalLink().getOrderIndex())
                            .build()));

            FunctionBucket functionBucket = globalBucket.functionBuckets.computeIfAbsent(functionId, ignored -> new FunctionBucket(
                    NavbarFunctionLinkInfoResponse.builder()
                            .id(primary.getFunctionLink().getId())
                            .displayName(primary.getFunctionLink().getDisplayName())
                            .routePath(primary.getFunctionLink().getRoutePath())
                            .orderIndex(primary.getFunctionLink().getOrderIndex())
                            .build(),
                    PermissionFlagsResponse.builder()
                            .canView(permission.canView())
                            .canAdd(permission.canAdd())
                            .canManage(permission.canManage())
                            .build()));

            functionBucket.primaryLinks.add(NavbarPrimaryLinkResponse.builder()
                    .id(primary.getId())
                    .displayName(primary.getDisplayName())
                    .orderIndex(primary.getOrderIndex())
                    .build());
        }

        List<NavbarGlobalGroupResponse> result = new ArrayList<>();
        for (GlobalBucket globalBucket : globalBuckets.values()) {
            if (globalBucket.functionBuckets.isEmpty()) {
                continue;
            }
            List<NavbarFunctionGroupResponse> functionGroups = globalBucket.functionBuckets.values().stream()
                    .map(f -> NavbarFunctionGroupResponse.builder()
                            .functionLink(f.functionLinkInfo)
                            .permissions(f.permissions)
                            .primaryLinks(f.primaryLinks)
                            .build())
                    .toList();

            result.add(NavbarGlobalGroupResponse.builder()
                    .globalLink(globalBucket.globalLinkInfo)
                    .functionLinks(functionGroups)
                    .build());
        }

        session.setAttribute(MENU_CACHE_VERSION_KEY, currentVersion);
        session.setAttribute(MENU_CACHE_KEY, result);
        return result;
    }

    private static final class GlobalBucket {
        private final NavbarGlobalLinkInfoResponse globalLinkInfo;
        private final Map<Long, FunctionBucket> functionBuckets = new LinkedHashMap<>();

        private GlobalBucket(NavbarGlobalLinkInfoResponse globalLinkInfo) {
            this.globalLinkInfo = globalLinkInfo;
        }
    }

    private static final class FunctionBucket {
        private final NavbarFunctionLinkInfoResponse functionLinkInfo;
        private final PermissionFlagsResponse permissions;
        private final List<NavbarPrimaryLinkResponse> primaryLinks = new ArrayList<>();

        private FunctionBucket(NavbarFunctionLinkInfoResponse functionLinkInfo, PermissionFlagsResponse permissions) {
            this.functionLinkInfo = functionLinkInfo;
            this.permissions = permissions;
        }
    }

    private record PermissionBits(boolean canView, boolean canAdd, boolean canManage) {
        private PermissionBits merge(PermissionBits other) {
            return new PermissionBits(
                    this.canView || other.canView,
                    this.canAdd || other.canAdd,
                    this.canManage || other.canManage);
        }
    }
}
