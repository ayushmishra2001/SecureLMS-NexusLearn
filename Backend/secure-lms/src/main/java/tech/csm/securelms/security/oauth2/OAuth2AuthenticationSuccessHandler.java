package tech.csm.securelms.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.OAuth2UserProvisioningService;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuth2UserProvisioningService oauth2UserProvisioningService;
    private final OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler;

    @Value("${app.oauth2.redirect-success-url:http://localhost:4200/login?oauth2=success}")
    private String successRedirectUrl;

    private final HttpSessionSecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        org.springframework.security.core.Authentication authentication)
            throws IOException, ServletException {
        try {
            OAuth2User oauth2User = ((OAuth2AuthenticationToken) authentication).getPrincipal();
            UserPrincipal userPrincipal = oauth2UserProvisioningService.provisionAndLoadPrincipal(oauth2User);

            UsernamePasswordAuthenticationToken appAuthentication =
                    new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
            appAuthentication.setDetails(authentication.getDetails());

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(appAuthentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            clearAuthenticationAttributes(request);
            getRedirectStrategy().sendRedirect(request, response, successRedirectUrl);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            oauth2AuthenticationFailureHandler.sendFailureRedirect(request, response, ex.getMessage());
        }
    }
}

