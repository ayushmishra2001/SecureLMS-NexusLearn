package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.Village;
import java.util.List;
import java.util.Optional;

@Repository
public interface VillageRepository extends JpaRepository<Village, Long> {
    List<Village> findByPanchayatIdAndStatus(Long panchayatId, String status);
    List<Village> findByStatus(String status);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByNameIgnoreCaseAndPanchayat_Id(String name, Long parentId);
    Optional<Village> findByNameIgnoreCaseAndPanchayat_Id(String name, Long parentId);
    boolean existsByNameIgnoreCaseAndPanchayat_IdAndIdNot(String name, Long parentId, Long id);
}







