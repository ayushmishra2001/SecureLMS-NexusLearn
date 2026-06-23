package tech.csm.securelms.security.oauth2;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.oauth2.redirect-failure-url:http://localhost:4200/login?oauth2=error}")
    private String failureRedirectUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        String message = (exception != null && exception.getMessage() != null && !exception.getMessage().isBlank())
                ? exception.getMessage()
                : "OAuth login failed";
        String redirect = failureRedirectUrl + "&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8);
        getRedirectStrategy().sendRedirect(request, response, redirect);
    }

    public void sendFailureRedirect(HttpServletRequest request,
                                    HttpServletResponse response,
                                    String message) throws IOException {
        String safeMessage = (message != null && !message.isBlank()) ? message : "OAuth login failed";
        String redirect = failureRedirectUrl + "&message=" + URLEncoder.encode(safeMessage, StandardCharsets.UTF_8);
        getRedirectStrategy().sendRedirect(request, response, redirect);
    }
}

