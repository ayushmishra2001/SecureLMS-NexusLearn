package tech.csm.securelms.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class AuthorizationServerLoginSuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final RequestCache requestCache = new HttpSessionRequestCache();

    @Value("${app.oauth2.redirect-success-url:http://localhost:4200/login?oauth2=success}")
    private String oauthSuccessRedirectUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        SavedRequest savedRequest = requestCache.getRequest(request, response);
        String target = savedRequest != null ? savedRequest.getRedirectUrl() : null;

        if (target != null && target.contains("/oauth2/authorize")) {
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        requestCache.removeRequest(request, response);
        getRedirectStrategy().sendRedirect(request, response, oauthSuccessRedirectUrl);
    }
}

