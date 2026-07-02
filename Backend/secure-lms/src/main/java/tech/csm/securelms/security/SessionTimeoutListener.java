package tech.csm.securelms.security;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.session.SessionDestroyedEvent;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.session.HttpSessionDestroyedEvent;
import org.springframework.stereotype.Component;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.service.SecurityAuditService;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionTimeoutListener implements ApplicationListener<SessionDestroyedEvent> {

    private final SecurityAuditService securityAuditService;
    private final UserRepository userRepository;

    @Override
    public void onApplicationEvent(SessionDestroyedEvent event) {
        String ipAddress = null;
        String browser = null;

        if (event instanceof HttpSessionDestroyedEvent httpEvent) {
            HttpSession session = httpEvent.getSession();
            ipAddress = (String) session.getAttribute("CLIENT_IP");
            browser = (String) session.getAttribute("CLIENT_BROWSER");
        }

        List<SecurityContext> securityContexts = event.getSecurityContexts();
        
        for (SecurityContext securityContext : securityContexts) {
            Authentication authentication = securityContext.getAuthentication();
            if (authentication != null) {
                Object principal = authentication.getPrincipal();
                User user = null;
                String contextInfo = null;

                if (principal instanceof UserPrincipal userPrincipal) {
                    user = userRepository.findById(userPrincipal.getId()).orElse(null);
                    contextInfo = userPrincipal.getEmail() != null ? userPrincipal.getEmail() : userPrincipal.getUsername();
                } else if (principal instanceof UserDetails userDetails) {
                    contextInfo = userDetails.getUsername();
                    user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
                }

                if (user != null || contextInfo != null) {
                    log.info("Session expired for user: {}", contextInfo);
                    securityAuditService.logEvent(
                            user,
                            SecurityEventType.SESSION_TIMEOUT,
                            "SUCCESS",
                            ipAddress, 
                            browser, 
                            contextInfo,
                            "Session expired due to inactivity");
                }
            }
        }
    }
}
