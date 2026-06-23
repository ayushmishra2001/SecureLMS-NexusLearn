package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.GroupMasterRequest;
import tech.csm.securelms.dto.response.GroupMasterResponse;
import tech.csm.securelms.dto.response.RoleMasterResponse;
import tech.csm.securelms.entity.GroupMaster;
import tech.csm.securelms.entity.RoleMaster;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.repository.RoleMasterRepository;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.entity.User;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupMasterService {

    private final GroupMasterRepository groupMasterRepository;
    private final RoleMasterRepository roleMasterRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<GroupMasterResponse> list() {
        return groupMasterRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GroupMasterResponse get(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public GroupMasterResponse create(GroupMasterRequest request) {
        if (groupMasterRepository.existsByGroupNameIgnoreCase(request.getGroupName().trim())) {
            throw new BadRequestException("Group with name '" + request.getGroupName() + "' already exists");
        }

        GroupMaster group = GroupMaster.builder()
                .groupName(request.getGroupName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        
        GroupMaster savedGroup = groupMasterRepository.save(group);
        assignRoles(savedGroup, request.getRoleIds());
        if (request.getUserIds() != null) {
            assignUsersToGroup(savedGroup.getId(), request.getUserIds());
        }
        return toResponse(savedGroup);
    }

    @Transactional
    public GroupMasterResponse update(Long id, GroupMasterRequest request) {
        GroupMaster group = findById(id);
        
        String newName = request.getGroupName().trim();
        if (!group.getGroupName().equalsIgnoreCase(newName)) {
            if (groupMasterRepository.existsByGroupNameIgnoreCase(newName)) {
                throw new BadRequestException("Group with name '" + newName + "' already exists");
            }
            group.setGroupName(newName);
        }

        if (request.getDescription() != null) {
            group.setDescription(request.getDescription().trim());
        }
        if (request.getActive() != null) {
            group.setActive(request.getActive());
        }
        
        assignRoles(group, request.getRoleIds());
        if (request.getUserIds() != null) {
            assignUsersToGroup(group.getId(), request.getUserIds());
        }
        return toResponse(groupMasterRepository.save(group));
    }

    @Transactional
    public GroupMasterResponse setActive(Long id, boolean active) {
        GroupMaster group = findById(id);
        group.setActive(active);
        return toResponse(groupMasterRepository.save(group));
    }

    public GroupMaster findById(Long id) {
        return groupMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + id));
    }
    
    private void assignRoles(GroupMaster group, List<Long> roleIds) {
        if (roleIds != null) {
            // First clear existing mappings for this group, then add new ones
            List<RoleMaster> existingRoles = roleMasterRepository.findByGroupIdAndActiveTrue(group.getId());
            for (RoleMaster role : existingRoles) {
                role.getGroups().remove(group);
                roleMasterRepository.save(role);
            }
            
            for (Long roleId : roleIds) {
                RoleMaster role = roleMasterRepository.findById(roleId)
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + roleId));
                role.getGroups().add(group);
                roleMasterRepository.save(role);
            }
        }
    }

    private GroupMasterResponse toResponse(GroupMaster group) {
        List<RoleMasterResponse> roleResponses = roleMasterRepository.findByGroupIdAndActiveTrue(group.getId())
                .stream()
                .map(role -> RoleMasterResponse.builder()
                        .id(role.getId())
                        .code(role.getCode())
                        .displayName(role.getDisplayName())
                        .active(role.isActive())
                        .build())
                .collect(Collectors.toList());

        return GroupMasterResponse.builder()
                .id(group.getId())
                .groupName(group.getGroupName())
                .description(group.getDescription())
                .active(group.isActive())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .userCount(userRepository.countByGroup_Id(group.getId()))
                .roles(roleResponses)
                .build();
    }

    @Transactional
    public void assignUsersToGroup(Long groupId, List<Long> userIds) {
        GroupMaster group = findById(groupId);

        // Fetch current mapped users
        List<User> currentUsers = userRepository.findByGroup_Id(groupId);
        for (User user : currentUsers) {
            if (userIds == null || !userIds.contains(user.getId())) {
                user.setGroup(null);
                userRepository.save(user);
            }
        }

        // Add newly assigned users
        if (userIds != null && !userIds.isEmpty()) {
            List<User> newUsers = userRepository.findAllById(userIds);
            for (User user : newUsers) {
                if (user.getGroup() == null || !user.getGroup().getId().equals(groupId)) {
                    user.setGroup(group);
                    userRepository.save(user);
                }
            }
        }
    }
}
