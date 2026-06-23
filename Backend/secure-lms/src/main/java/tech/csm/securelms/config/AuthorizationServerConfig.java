package tech.csm.securelms.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.core.oidc.endpoint.OidcParameterNames;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.AesEncryptionService;
import tech.csm.securelms.service.RoleMasterService;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

@Configuration
public class AuthorizationServerConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http,
            CorsConfig corsConfig) throws Exception {
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);

        OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
                http.getConfigurer(OAuth2AuthorizationServerConfigurer.class);
        authorizationServerConfigurer.oidc(Customizer.withDefaults());

        RequestMatcher endpointsMatcher = authorizationServerConfigurer.getEndpointsMatcher();
        RequestMatcher excludedProbeMatcher = new AntPathRequestMatcher("/.well-known/appspecific/**");
        RequestMatcher authorizationServerMatcher = new AndRequestMatcher(
                endpointsMatcher,
                new NegatedRequestMatcher(excludedProbeMatcher));

        http
                .securityMatcher(authorizationServerMatcher)
                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(Customizer.withDefaults()));

        return http.build();
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository(
            PasswordEncoder passwordEncoder,
            @Value("${app.oauth2.internal.client-id:secure-lms-client}") String clientId,
            @Value("${app.oauth2.internal.client-secret:secure-lms-secret}") String clientSecret,
            @Value("${app.oauth2.internal.redirect-uri:http://localhost:8080/api/auth/login/oauth2/code/securelms-local}") String redirectUri) {

        RegisteredClient secureLmsClient = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(clientId)
                .clientSecret(passwordEncoder.encode(clientSecret))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(redirectUri)
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .scope(OidcScopes.EMAIL)
                .clientSettings(ClientSettings.builder()
                        .requireAuthorizationConsent(false)
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofMinutes(15))
                        .refreshTokenTimeToLive(Duration.ofDays(30))
                        .reuseRefreshTokens(false)
                        .build())
                .build();

        return new InMemoryRegisteredClientRepository(secureLmsClient);
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings(
            @Value("${app.oauth2.auth-server.issuer:http://localhost:8080}") String issuer) {
        return AuthorizationServerSettings.builder()
                .issuer(issuer)
                .build();
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource() {
        RSAKey rsaKey = generateRsa();
        JWKSet jwkSet = new JWKSet(rsaKey);
        return new ImmutableJWKSet<>(jwkSet);
    }

    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }

    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer() {
        return context -> {
            Authentication authentication = context.getPrincipal();
            Object principal = authentication.getPrincipal();

            String username = authentication.getName();
            String email = null;
            String role = null;
            Long groupId = null;
            String groupName = null;

            if (principal instanceof UserPrincipal userPrincipal) {
                username = userPrincipal.getUsername();
                email = userPrincipal.getEmail();
                role = userPrincipal.getRole();
                groupId = userPrincipal.getGroupId();
                groupName = userPrincipal.getGroupName();
            }

            if (OidcParameterNames.ID_TOKEN.equals(context.getTokenType().getValue())) {
                context.getClaims().claim("preferred_username", username);
                if (email != null) {
                    context.getClaims().claim("email", email);
                    context.getClaims().claim("email_verified", true);
                }
                if (role != null) {
                    context.getClaims().claim("role", role);
                }
                if (groupId != null) {
                    context.getClaims().claim("groupId", groupId);
                    context.getClaims().claim("groupName", groupName);
                }
            }
        };
    }

    @Bean
    public CommandLineRunner oauth2TestUserInitializer(
            UserRepository userRepository,
            RoleMasterService roleMasterService,
            AesEncryptionService aesEncryptionService,
            PasswordEncoder passwordEncoder,
            @Value("${app.oauth2.internal.test-user.enabled:true}") boolean enabled,
            @Value("${app.oauth2.internal.test-user.username:oauth_tester}") String username,
            @Value("${app.oauth2.internal.test-user.email:oauth.tester@securelms.local}") String email,
            @Value("${app.oauth2.internal.test-user.password:Test@12345}") String password,
            @Value("${app.oauth2.internal.test-user.first-name:OAuth}") String firstName,
            @Value("${app.oauth2.internal.test-user.last-name:Tester}") String lastName,
            @Value("${app.oauth2.internal.test-user.role:STUDENT}") String roleValue) {
        return args -> {
            if (!enabled) {
                return;
            }

            String normalizedEmail = email.toLowerCase(Locale.ROOT).trim();
            String emailHash = aesEncryptionService.hashEmail(normalizedEmail);
            if (userRepository.existsByEmailHash(emailHash)) {
                return;
            }

            String candidateUsername = username;
            int suffix = 1;
            while (userRepository.existsByUsername(candidateUsername)) {
                candidateUsername = username + suffix;
                suffix++;
            }

            String roleCode = roleValue == null || roleValue.isBlank() ? RoleCodes.STUDENT : roleValue;

            User user = User.builder()
                    .username(candidateUsername)
                    .email(normalizedEmail)
                    .emailHash(emailHash)
                    .password(passwordEncoder.encode(password))
                    .firstName(firstName)
                    .lastName(lastName)
                    .role(roleMasterService.findAssignableActiveByCode(roleCode))
                    .active(true)
                    .accountNonLocked(true)
                    .build();

            userRepository.save(user);
        };
    }

    private static RSAKey generateRsa() {
        KeyPair keyPair = generateRsaKey();
        RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();
        RSAPrivateKey privateKey = (RSAPrivateKey) keyPair.getPrivate();
        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(UUID.randomUUID().toString())
                .build();
    }

    private static KeyPair generateRsaKey() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
            keyPairGenerator.initialize(2048);
            return keyPairGenerator.generateKeyPair();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate RSA key pair", ex);
        }
    }
}
