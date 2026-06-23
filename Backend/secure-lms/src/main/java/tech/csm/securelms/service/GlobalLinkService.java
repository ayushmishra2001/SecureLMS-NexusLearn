package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.GlobalLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.GlobalLinkResponse;
import tech.csm.securelms.entity.GlobalLink;
import tech.csm.securelms.exception.ConflictException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.GlobalLinkRepository;
import tech.csm.securelms.repository.PrimaryLinkRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GlobalLinkService {

    private final GlobalLinkRepository globalLinkRepository;
    private final PrimaryLinkRepository primaryLinkRepository;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public List<GlobalLinkResponse> list(boolean includeInactive) {
        List<GlobalLink> items = includeInactive
                ? globalLinkRepository.findByOrderByOrderIndexAsc()
                : globalLinkRepository.findByActiveTrueOrderByOrderIndexAsc();
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional
    public GlobalLinkResponse create(GlobalLinkRequest request) {
        String displayName = sanitizeName(request.getDisplayName());
        if (globalLinkRepository.existsByDisplayNameIgnoreCase(displayName)) {
            throw new ConflictException("Global Link name already exists");
        }

        int nextOrder = globalLinkRepository.findTopByOrderByOrderIndexDesc()
                .map(GlobalLink::getOrderIndex)
                .orElse(0) + 1;

        GlobalLink saved = globalLinkRepository.save(GlobalLink.builder()
                .displayName(displayName)
                .orderIndex(nextOrder)
                .active(request.getActive() == null || request.getActive())
                .build());

        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public GlobalLinkResponse update(Long id, GlobalLinkRequest request) {
        GlobalLink entity = findById(id);
        String displayName = sanitizeName(request.getDisplayName());
        if (globalLinkRepository.existsByDisplayNameIgnoreCaseAndIdNot(displayName, id)) {
            throw new ConflictException("Global Link name already exists");
        }
        entity.setDisplayName(displayName);
        if (request.getActive() != null) {
            entity.setActive(request.getActive());
        }
        GlobalLink saved = globalLinkRepository.save(entity);
        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public GlobalLinkResponse softDelete(Long id) {
        GlobalLink entity = findById(id);
        entity.setActive(false);
        globalLinkRepository.save(entity);
        navbarCacheService.invalidateAll();
        return toResponse(entity);
    }

    @Transactional
    public List<GlobalLinkResponse> reorder(List<ReorderItemRequest> request) {
        if (request == null || request.isEmpty()) {
            return list(true);
        }
        Set<Long> ids = request.stream().map(ReorderItemRequest::getId).collect(Collectors.toSet());
        List<GlobalLink> links = globalLinkRepository.findAllById(ids);
        if (links.size() != ids.size()) {
            throw new ResourceNotFoundException("GlobalLink", "id", "one-or-more");
        }
        Map<Long, Integer> orderById = new HashMap<>();
        request.forEach(item -> orderById.put(item.getId(), item.getOrderIndex()));
        links.forEach(link -> link.setOrderIndex(orderById.get(link.getId())));
        globalLinkRepository.saveAll(links);
        navbarCacheService.invalidateAll();
        return list(true);
    }

    @Transactional(readOnly = true)
    public long countActivePrimaryLinks(Long globalLinkId) {
        return primaryLinkRepository.countByGlobalLinkIdAndActiveTrue(globalLinkId);
    }

    @Transactional(readOnly = true)
    public GlobalLink findById(Long id) {
        return globalLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GlobalLink", "id", id));
    }

    private String sanitizeName(String value) {
        return value == null ? null : value.trim();
    }

    private GlobalLinkResponse toResponse(GlobalLink item) {
        return GlobalLinkResponse.builder()
                .id(item.getId())
                .displayName(item.getDisplayName())
                .orderIndex(item.getOrderIndex())
                .active(item.isActive())
                .activePrimaryLinkCount(primaryLinkRepository.countByGlobalLinkIdAndActiveTrue(item.getId()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
