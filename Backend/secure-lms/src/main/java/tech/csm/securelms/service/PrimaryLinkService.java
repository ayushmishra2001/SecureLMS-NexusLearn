package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.PrimaryLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.PrimaryLinkResponse;
import tech.csm.securelms.entity.FunctionLink;
import tech.csm.securelms.entity.GlobalLink;
import tech.csm.securelms.entity.PrimaryLink;
import tech.csm.securelms.exception.ConflictException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.PrimaryLinkRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrimaryLinkService {

    private final PrimaryLinkRepository primaryLinkRepository;
    private final GlobalLinkService globalLinkService;
    private final FunctionLinkService functionLinkService;
    private final NavbarCacheService navbarCacheService;

    @Transactional(readOnly = true)
    public List<PrimaryLinkResponse> list(Long globalLinkId, Long functionLinkId) {
        return primaryLinkRepository.findForAdmin(globalLinkId, functionLinkId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PrimaryLinkResponse create(PrimaryLinkRequest request) {
        GlobalLink globalLink = globalLinkService.findById(request.getGlobalLinkId());
        FunctionLink functionLink = functionLinkService.findById(request.getFunctionLinkId());
        boolean active = request.getActive() == null || request.getActive();

        validateActiveScopeAvailability(globalLink.getId(), functionLink.getId(), active, null);

        int nextOrder = primaryLinkRepository.findMaxOrderIndexInScope(globalLink.getId(), functionLink.getId()) + 1;

        PrimaryLink saved = primaryLinkRepository.save(PrimaryLink.builder()
                .globalLink(globalLink)
                .functionLink(functionLink)
                .displayName(sanitizeName(request.getDisplayName()))
                .orderIndex(nextOrder)
                .active(active)
                .build());

        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public PrimaryLinkResponse update(Long id, PrimaryLinkRequest request) {
        PrimaryLink existing = findById(id);
        GlobalLink globalLink = globalLinkService.findById(request.getGlobalLinkId());
        FunctionLink functionLink = functionLinkService.findById(request.getFunctionLinkId());
        boolean active = request.getActive() == null ? existing.isActive() : request.getActive();

        validateActiveScopeAvailability(globalLink.getId(), functionLink.getId(), active, id);

        boolean scopeChanged = !existing.getGlobalLink().getId().equals(globalLink.getId())
                || !existing.getFunctionLink().getId().equals(functionLink.getId());
        if (scopeChanged) {
            int nextOrder = primaryLinkRepository.findMaxOrderIndexInScope(globalLink.getId(), functionLink.getId()) + 1;
            existing.setOrderIndex(nextOrder);
        }

        existing.setGlobalLink(globalLink);
        existing.setFunctionLink(functionLink);
        existing.setDisplayName(sanitizeName(request.getDisplayName()));
        existing.setActive(active);

        PrimaryLink saved = primaryLinkRepository.save(existing);
        navbarCacheService.invalidateAll();
        return toResponse(saved);
    }

    @Transactional
    public PrimaryLinkResponse softDelete(Long id) {
        PrimaryLink existing = findById(id);
        existing.setActive(false);
        primaryLinkRepository.save(existing);
        navbarCacheService.invalidateAll();
        return toResponse(existing);
    }

    @Transactional
    public List<PrimaryLinkResponse> reorder(List<ReorderItemRequest> request) {
        if (request == null || request.isEmpty()) {
            return list(null, null);
        }
        Set<Long> ids = request.stream().map(ReorderItemRequest::getId).collect(Collectors.toSet());
        List<PrimaryLink> links = primaryLinkRepository.findAllById(ids);
        if (links.size() != ids.size()) {
            throw new ResourceNotFoundException("PrimaryLink", "id", "one-or-more");
        }

        Long firstGlobalId = links.get(0).getGlobalLink().getId();
        Long firstFunctionId = links.get(0).getFunctionLink().getId();
        boolean sameScope = links.stream().allMatch(
                p -> p.getGlobalLink().getId().equals(firstGlobalId)
                        && p.getFunctionLink().getId().equals(firstFunctionId));
        if (!sameScope) {
            throw new ConflictException("Primary Links can only be reordered within the same Global + Function scope");
        }

        Map<Long, Integer> orderById = new HashMap<>();
        request.forEach(item -> orderById.put(item.getId(), item.getOrderIndex()));
        links.forEach(link -> link.setOrderIndex(orderById.get(link.getId())));
        primaryLinkRepository.saveAll(links);
        navbarCacheService.invalidateAll();
        return list(firstGlobalId, firstFunctionId);
    }

    private void validateActiveScopeAvailability(Long globalLinkId, Long functionLinkId, boolean active, Long currentId) {
        if (!active) {
            return;
        }

        boolean exists = currentId == null
                ? primaryLinkRepository.existsByGlobalLinkIdAndFunctionLinkIdAndActiveTrue(globalLinkId, functionLinkId)
                : primaryLinkRepository.existsByGlobalLinkIdAndFunctionLinkIdAndActiveTrueAndIdNot(
                        globalLinkId,
                        functionLinkId,
                        currentId);

        if (exists) {
            throw new ConflictException(
                    "The selected Global Link and Function Link combination already has an active route assigned. "
                            + "Deactivate or edit the existing Primary Link before assigning another route.");
        }
    }

    private PrimaryLink findById(Long id) {
        return primaryLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PrimaryLink", "id", id));
    }

    private String sanitizeName(String value) {
        return value == null ? null : value.trim();
    }

    private PrimaryLinkResponse toResponse(PrimaryLink item) {
        return PrimaryLinkResponse.builder()
                .id(item.getId())
                .globalLinkId(item.getGlobalLink().getId())
                .globalLinkName(item.getGlobalLink().getDisplayName())
                .functionLinkId(item.getFunctionLink().getId())
                .functionLinkName(item.getFunctionLink().getDisplayName())
                .displayName(item.getDisplayName())
                .orderIndex(item.getOrderIndex())
                .active(item.isActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
