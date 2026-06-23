package tech.csm.securelms.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tech.csm.securelms.entity.GroupPermission;
import tech.csm.securelms.entity.RolePermission;
import tech.csm.securelms.entity.UserPermission;
import tech.csm.securelms.repository.GroupPermissionRepository;
import tech.csm.securelms.repository.RolePermissionRepository;
import tech.csm.securelms.repository.UserPermissionRepository;
import tech.csm.securelms.security.UserPrincipal;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service("permissionService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionService {

    private final GroupPermissionRepository groupPermissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;

    public boolean hasPermission(Authentication authentication) {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return false;

        HttpServletRequest request = attrs.getRequest();
        String targetRoute = request.getRequestURI();
        if (targetRoute.startsWith("/api")) {
            targetRoute = targetRoute.substring(4); // remove /api
        }

        return hasPermission(authentication, targetRoute);
    }

    public boolean hasAnyPermission(Authentication authentication, String... allowedRoutes) {
        for (String route : allowedRoutes) {
            if (hasPermission(authentication, route)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasPermission(Authentication authentication, String targetRoute) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return false;
        }

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return false;

        HttpServletRequest request = attrs.getRequest();

        String method = request.getMethod();
        String action = switch (method.toUpperCase()) {
            case "GET" -> "VIEW";
            case "POST" -> "ADD";
            default -> "MANAGE";
        };

        Long userId = principal.getId();
        Long roleId = principal.getRoleId();
        Long groupId = principal.getGroupId();

        // Super Admin bypass: Super Admin role always has full access
        if ("SUPER_ADMIN".equalsIgnoreCase(principal.getRole())) {
            return true;
        }

        // Check permissions with override logic
        List<UserPermission> userPermissions = userPermissionRepository.findByUserId(userId);
        List<RolePermission> rolePermissions = roleId != null ? rolePermissionRepository.findByRoleId(roleId) : List.of();
        List<GroupPermission> groupPermissions = groupId != null ? groupPermissionRepository.findByGroupId(groupId) : List.of();

        java.util.Set<tech.csm.securelms.entity.FunctionLink> relevantLinks = new java.util.HashSet<>();
        userPermissions.forEach(up -> relevantLinks.add(up.getFunctionLink()));
        rolePermissions.forEach(rp -> relevantLinks.add(rp.getFunctionLink()));
        groupPermissions.forEach(gp -> relevantLinks.add(gp.getFunctionLink()));

        for (tech.csm.securelms.entity.FunctionLink link : relevantLinks) {
            if (matchesRoute(link.getRoutePath(), targetRoute)) {
                
                // 1. User Permission overrides everything (Option A)
                UserPermission up = userPermissions.stream()
                        .filter(p -> p.getFunctionLink().getId().equals(link.getId()))
                        .findFirst().orElse(null);
                
                if (up != null) {
                    if (hasAction(up.isCanView(), up.isCanAdd(), up.isCanManage(), action)) {
                        return true;
                    }
                    continue; // User explicitly blocked or missing required action, do not fallback
                }

                // 2. Fall back to Role Permission intersected with Group Permission
                RolePermission rp = rolePermissions.stream()
                        .filter(p -> p.getFunctionLink().getId().equals(link.getId()))
                        .findFirst().orElse(null);
                        
                if (rp == null) {
                    continue; // Role has NO permissions for this feature
                }
                
                if (groupId != null) {
                    GroupPermission gp = groupPermissions.stream()
                            .filter(p -> p.getFunctionLink().getId().equals(link.getId()))
                            .findFirst().orElse(null);
                    
                    if (gp == null) {
                        continue; // Group has NO permissions for this feature, so it's blocked.
                    }
                    
                    boolean effectiveView = rp.isCanView() && gp.isCanView();
                    boolean effectiveAdd = rp.isCanAdd() && gp.isCanAdd();
                    boolean effectiveManage = rp.isCanManage() && gp.isCanManage();
                    
                    if (hasAction(effectiveView, effectiveAdd, effectiveManage, action)) {
                        return true;
                    }
                } else {
                    if (hasAction(rp.isCanView(), rp.isCanAdd(), rp.isCanManage(), action)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean matchesRoute(String functionRoute, String targetRoute) {
        if (functionRoute == null) return false;
        
        // Ensure standard formatting
        String f = functionRoute.replaceAll("/+", "/");
        String t = targetRoute.replaceAll("/+", "/");
        
        boolean hasRegex = false;
        // Remove {role} template if present (for dynamic paths like /{role}/users)
        if (f.contains("{role}")) {
            f = f.replace("/{role}/", "/[^/]+/");
            if (f.startsWith("{role}/")) f = "[^/]+/" + f.substring(7);
            hasRegex = true;
        }
        
        if (t.equals(f) || (hasRegex && t.matches(f))) {
            return true;
        }
        
        // If function route ends without a slash, append a slash for prefix matching
        // e.g., /admin/users -> /admin/users/
        if (!f.endsWith("/")) {
            if (!hasRegex && t.startsWith(f + "/")) {
                return true;
            } else if (hasRegex && t.matches(f + "/.*")) {
                return true;
            }
        }
        
        return false;
    }

    private boolean hasAction(boolean canView, boolean canAdd, boolean canManage, String action) {
        return switch (action) {
            case "VIEW" -> canView || canManage;
            case "ADD" -> canAdd || canManage;
            case "MANAGE" -> canManage;
            default -> false;
        };
    }
}
