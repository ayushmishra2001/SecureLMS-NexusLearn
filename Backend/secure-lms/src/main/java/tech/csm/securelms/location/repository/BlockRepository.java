package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.Block;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlockRepository extends JpaRepository<Block, Long> {
    List<Block> findByDistrictIdAndStatus(Long districtId, String status);
    List<Block> findByStatus(String status);
    Optional<Block> findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByNameIgnoreCaseAndDistrict_Id(String name, Long parentId);
    Optional<Block> findByNameIgnoreCaseAndDistrict_Id(String name, Long parentId);
    boolean existsByNameIgnoreCaseAndDistrict_IdAndIdNot(String name, Long parentId, Long id);
    
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}





