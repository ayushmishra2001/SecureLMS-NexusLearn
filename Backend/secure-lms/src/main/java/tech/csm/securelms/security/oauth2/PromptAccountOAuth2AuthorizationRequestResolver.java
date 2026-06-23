package tech.csm.securelms.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.LinkedHashMap;
import java.util.Map;

public class PromptAccountOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final OAuth2AuthorizationRequestResolver delegate;

    public PromptAccountOAuth2AuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository,
            String authorizationRequestBaseUri) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, authorizationRequestBaseUri);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return customize(delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return customize(delegate.resolve(request, clientRegistrationId));
    }

    private OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest request) {
        if (request == null) {
            return null;
        }

        String authorizationUri = request.getAuthorizationUri();
        Map<String, Object> additionalParameters = new LinkedHashMap<>(request.getAdditionalParameters());

        if (authorizationUri != null && authorizationUri.contains("accounts.google.com")) {
            additionalParameters.put("prompt", "select_account");
        } else if (authorizationUri != null && authorizationUri.contains("/oauth2/authorize")) {
            // For internal provider, force explicit authentication to avoid silent auto-login.
            additionalParameters.put("prompt", "login");
            additionalParameters.put("max_age", "0");
        } else {
            return request;
        }

        return OAuth2AuthorizationRequest.from(request)
                .additionalParameters(additionalParameters)
                .build();
    }
}
