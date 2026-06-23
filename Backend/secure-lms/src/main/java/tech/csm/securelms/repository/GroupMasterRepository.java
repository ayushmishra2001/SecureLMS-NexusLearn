package tech.csm.securelms.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.GroupMaster;

import java.util.List;

@Repository
public interface GroupMasterRepository extends JpaRepository<GroupMaster, Long> {

    List<GroupMaster> findByActiveTrue();

    java.util.Optional<GroupMaster> findByGroupName(String groupName);

    boolean existsByGroupNameIgnoreCase(String groupName);

    @Query("SELECT g FROM GroupMaster g WHERE :search IS NULL OR LOWER(g.groupName) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<GroupMaster> findAllBySearch(@Param("search") String search, Pageable pageable);
}
