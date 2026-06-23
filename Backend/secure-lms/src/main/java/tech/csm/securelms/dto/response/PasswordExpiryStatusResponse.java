package tech.csm.securelms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Response payload for GET /api/auth/password-expiry-status.
 *
 * warningType values:
 * "REGISTRATION" - current password is still from registration event
 * "PASSWORD_CHANGE" - current password is from manual change event
 * "PASSWORD_RESET" - current password is from reset event
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PasswordExpiryStatusResponse {

    /** True when expiry status should be shown to the user. */
    private boolean warningRequired;

    /** Source event that set the current password baseline. */
    private String warningType;

    /**
     * Calendar days until password expiry.
     * 0 means "expires today"; negative means "already expired".
     */
    private Integer daysUntilExpiry;

    /** Exact expiry date for display. */
    private LocalDate expiresOn;
}
