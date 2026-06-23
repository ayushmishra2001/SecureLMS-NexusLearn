package tech.csm.securelms.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.PasswordResetToken;
import tech.csm.securelms.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PasswordResetToken t join fetch t.user where t.tokenHash = :tokenHash")
    Optional<PasswordResetToken> findForUpdateByTokenHash(@Param("tokenHash") String tokenHash);

    List<PasswordResetToken> findByUserAndUsedAtIsNullAndExpiresAtAfter(User user, LocalDateTime now);

    void deleteByUser_Id(Long userId);

    // --- NEW: used by PasswordExpiryService to find the most recent completed
    // reset ---
    /**
     * Returns the single most recent token that was actually consumed (usedAt IS
     * NOT NULL).
     * Its usedAt timestamp tells us when the user last performed a password reset
     * via email link.
     */
    Optional<PasswordResetToken> findTopByUserAndUsedAtIsNotNullOrderByUsedAtDesc(User user);
}
