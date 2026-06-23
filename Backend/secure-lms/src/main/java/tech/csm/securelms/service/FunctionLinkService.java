package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.FunctionLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.FunctionLinkResponse;
import tech.csm.securelms.entity.FunctionLink;
import tech.csm.securelms.exception.ConflictException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.FunctionLinkRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;
import tech.csm.securelms.repository.RolePermissionRepository;
import tech.csm.securelms.repository.UserPermissionRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FunctionLinkService {

    private final FunctionLinkRepository functionLinkRepository;
    private final PrimaryLinkRepository primaryLinkRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public List<FunctionLinkResponse> list(boolean includeInactive) {
        List<FunctionLink> items = includeInactive
                ? functionLinkRepository.findByOrderByOrderIndexAsc()
                : functionLinkRepository.findByActiveTrueOrderByOrderIndexAsc();
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional
    public FunctionLinkResponse create(FunctionLinkRequest request) {
        String displayName = sanitizeName(request.getDisplayName());
        if (functionLinkRepository.existsByDisplayNameIgnoreCase(displayName)) {
            throw new ConflictException("Function Link name already exists");
        }

        String routePath = sanitizeRoutePath(request.getRoutePath());
        if (functionLinkRepository.existsByRoutePathIgnoreCase(routePath)) {
            throw new ConflictException("Route path already exists");
        }

        int nextOrder = functionLinkRepository.findTopByOrderByOrderIndexDesc()
                .map(FunctionLink::getOrderIndex)
                .orElse(0) + 1;

        FunctionLink saved = functionLinkRepository.save(FunctionLink.builder()
                .displayName(displayName)
                .routePath(routePath)
                .orderIndex(nextOrder)
                .active(request.getActive() == null || request.getActive())
                .build());
        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public FunctionLinkResponse update(Long id, FunctionLinkRequest request) {
        FunctionLink entity = findById(id);
        String displayName = sanitizeName(request.getDisplayName());
        if (functionLinkRepository.existsByDisplayNameIgnoreCaseAndIdNot(displayName, id)) {
            throw new ConflictException("Function Link name already exists");
        }
        
        String routePath = sanitizeRoutePath(request.getRoutePath());
        if (functionLinkRepository.existsByRoutePathIgnoreCaseAndIdNot(routePath, id)) {
            throw new ConflictException("Route path already exists");
        }
        
        entity.setDisplayName(displayName);
        entity.setRoutePath(routePath);
        if (request.getActive() != null) {
            entity.setActive(request.getActive());
        }
        FunctionLink saved = functionLinkRepository.save(entity);
        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public FunctionLinkResponse softDelete(Long id) {
        FunctionLink entity = findById(id);
        entity.setActive(false);
        functionLinkRepository.save(entity);
        navbarCacheService.invalidateAll();
        return toResponse(entity);
    }

    @Transactional
    public List<FunctionLinkResponse> reorder(List<ReorderItemRequest> request) {
        if (request == null || request.isEmpty()) {
            return list(true);
        }
        Set<Long> ids = request.stream().map(ReorderItemRequest::getId).collect(Collectors.toSet());
        List<FunctionLink> links = functionLinkRepository.findAllById(ids);
        if (links.size() != ids.size()) {
            throw new ResourceNotFoundException("FunctionLink", "id", "one-or-more");
        }
        Map<Long, Integer> orderById = new HashMap<>();
        request.forEach(item -> orderById.put(item.getId(), item.getOrderIndex()));
        links.forEach(link -> link.setOrderIndex(orderById.get(link.getId())));
        functionLinkRepository.saveAll(links);
        navbarCacheService.invalidateAll();
        return list(true);
    }

    @Transactional(readOnly = true)
    public long countActivePrimaryLinks(Long functionLinkId) {
        return primaryLinkRepository.countByFunctionLinkIdAndActiveTrue(functionLinkId);
    }

    @Transactional(readOnly = true)
    public long countMappedUsers(Long functionLinkId) {
        return userPermissionRepository.countByFunctionLinkId(functionLinkId)
                + rolePermissionRepository.countByFunctionLinkId(functionLinkId);
    }

    @Transactional(readOnly = true)
    public FunctionLink findById(Long id) {
        return functionLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FunctionLink", "id", id));
    }

    private String sanitizeName(String value) {
        return value == null ? null : value.trim();
    }

    private String sanitizeRoutePath(String routePath) {
        String normalized = routePath == null ? "" : routePath.trim();
        if (!normalized.startsWith("/")) {
            throw new ConflictException("Route path must start with '/'");
        }
        return normalized;
    }

    private FunctionLinkResponse toResponse(FunctionLink item) {
        return FunctionLinkResponse.builder()
                .id(item.getId())
                .displayName(item.getDisplayName())
                .routePath(item.getRoutePath())
                .orderIndex(item.getOrderIndex())
                .active(item.isActive())
                .activePrimaryLinkCount(primaryLinkRepository.countByFunctionLinkIdAndActiveTrue(item.getId()))
                .mappedUserCount(userPermissionRepository.countByFunctionLinkId(item.getId())
                        + rolePermissionRepository.countByFunctionLinkId(item.getId()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
