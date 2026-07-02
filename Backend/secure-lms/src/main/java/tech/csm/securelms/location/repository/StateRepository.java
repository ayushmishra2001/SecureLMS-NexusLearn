package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.State;
import java.util.List;
import java.util.Optional;

@Repository
public interface StateRepository extends JpaRepository<State, Long> {
    List<State> findByCountryIdAndStatus(Long countryId, String status);
    List<State> findByStatus(String status);
    Optional<State> findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByNameIgnoreCaseAndCountry_Id(String name, Long countryId);
    Optional<State> findByNameIgnoreCaseAndCountry_Id(String name, Long countryId);
    boolean existsByNameIgnoreCaseAndCountry_IdAndIdNot(String name, Long countryId, Long id);
    
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}



