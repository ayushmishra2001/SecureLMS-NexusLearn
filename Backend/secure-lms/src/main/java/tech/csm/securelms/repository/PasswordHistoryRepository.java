package tech.csm.securelms.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.PasswordHistory;
import tech.csm.securelms.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordHistoryRepository extends JpaRepository<PasswordHistory, Long> {

    List<PasswordHistory> findByUserAndExpiresAtAfterOrderByCreatedAtDesc(
            User user,
            LocalDateTime now,
            Pageable pageable);

    List<PasswordHistory> findByUserOrderByCreatedAtDesc(User user);

    void deleteAllByExpiresAtBefore(LocalDateTime now);

    void deleteByUser_Id(Long userId);

    // --- NEW: used by PasswordExpiryService to find the most recent change ---
    /**
     * Returns the single most recent PasswordHistory entry for the given user.
     * Its createdAt timestamp equals the moment the user last changed their
     * password,
     * because savePasswordHistory() is called at the point of each password change.
     */
    Optional<PasswordHistory> findTopByUserOrderByCreatedAtDesc(User user);
}
