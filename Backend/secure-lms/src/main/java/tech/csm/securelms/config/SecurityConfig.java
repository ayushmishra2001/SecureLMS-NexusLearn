package tech.csm.securelms.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.util.StringUtils;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import tech.csm.securelms.security.oauth2.OAuth2AuthenticationFailureHandler;
import tech.csm.securelms.security.oauth2.OAuth2AuthenticationSuccessHandler;
import tech.csm.securelms.security.oauth2.PromptAccountOAuth2AuthorizationRequestResolver;
import tech.csm.securelms.security.oauth2.AuthorizationServerLoginSuccessHandler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

        private final AuthenticationProvider authenticationProvider;
        private final CorsConfig corsConfig;
        private final SessionRegistry sessionRegistry;
        private final ClientRegistrationRepository clientRegistrationRepository;
        private final OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler;
        private final OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler;
        private final AuthorizationServerLoginSuccessHandler authorizationServerLoginSuccessHandler;

        @Bean
        @Order(0)
        public SecurityFilterChain wellKnownBypassSecurityFilterChain(HttpSecurity http) throws Exception {
                http
                                .securityMatcher(new AntPathRequestMatcher("/.well-known/appspecific/**"))
                                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                                .csrf(csrf -> csrf.disable())
                                .requestCache(cache -> cache.disable())
                                .securityContext(context -> context.disable())
                                .sessionManagement(session -> session.disable());
                return http.build();
        }

        @Bean
        @Order(2)
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                CsrfTokenRequestHandler requestHandler = new SpaCsrfTokenRequestHandler();

                CookieCsrfTokenRepository tokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
                tokenRepository.setCookiePath("/");

                http
                                .csrf(csrf -> csrf
                                                .csrfTokenRepository(tokenRepository)
                                                .csrfTokenRequestHandler(requestHandler))
                                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                                .headers(headers -> headers.referrerPolicy(referrer -> referrer
                                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
                                .exceptionHandling(exception -> exception
                                                .defaultAuthenticationEntryPointFor((request, response, ex) -> {
                                                        response.setStatus(HttpStatus.UNAUTHORIZED.value());
                                                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                                                        response.getWriter().write(
                                                                        "{\"success\":false,\"message\":\"Not authenticated\"}");
                                                }, new AntPathRequestMatcher("/api/**"))
                                                .accessDeniedHandler((request, response, ex) -> {
                                                        String message = (ex instanceof InvalidCsrfTokenException
                                                                        || ex instanceof MissingCsrfTokenException)
                                                                                        ? "Invalid or missing CSRF token"
                                                                                        : "You do not have permission to perform this action";
                                                        response.setStatus(HttpStatus.FORBIDDEN.value());
                                                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                                                        response.getWriter().write("{\"success\":false,\"message\":\""
                                                                        + message + "\"}");
                                                }))

                                .authorizeHttpRequests(auth -> auth

                                                .requestMatchers(
                                                                "/api/auth/csrf",
                                                                "/api/auth/roles",
                                                                "/api/auth/registration-roles",
                                                                "/api/auth/groups",
                                                                "/api/auth/login",
                                                                "/api/auth/register",
                                                                "/api/auth/forgot-password",
                                                                "/api/auth/reset-password/validate",
                                                                "/api/auth/reset-password",
                                                                "/api/auth/session",
                                                                "/api/auth/oauth2/**",
                                                                "/api/auth/login/oauth2/**",
                                                                "/.well-known",
                                                                "/.well-known/appspecific/**",
                                                                "/.well-known/**",
                                                                "/oauth2/**",
                                                                "/login/oauth2/**")
                                                .permitAll()

                                                .requestMatchers(
                                                                "/",
                                                                "/index.html",
                                                                "/login.html",
                                                                "/register.html",
                                                                "/forgot-password.html",
                                                                "/reset-password.html",
                                                                "/admin/**",
                                                                "/trainer/**",
                                                                "/student/**",
                                                                "/css/**",
                                                                "/js/**",
                                                                "/favicon.ico")
                                                .permitAll()

                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                                .requestMatchers("/api/admin/**").authenticated()
                                                .requestMatchers("/api/trainer/**").authenticated()
                                                .requestMatchers("/api/student/**").authenticated()
                                                .requestMatchers("/api/export/**").authenticated()
                                                .anyRequest().authenticated())

                                .authenticationProvider(authenticationProvider)
                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(authorization -> authorization
                                                                .baseUri("/api/auth/oauth2/authorization")
                                                                .authorizationRequestResolver(
                                                                                new PromptAccountOAuth2AuthorizationRequestResolver(
                                                                                                clientRegistrationRepository,
                                                                                                "/api/auth/oauth2/authorization")))
                                                .redirectionEndpoint(redirection -> redirection
                                                                .baseUri("/api/auth/login/oauth2/code/*"))
                                                .successHandler(oauth2AuthenticationSuccessHandler)
                                                .failureHandler(oauth2AuthenticationFailureHandler))
                                .formLogin(form -> form.successHandler(authorizationServerLoginSuccessHandler))
                                .sessionManagement(session -> session
                                                .maximumSessions(-1)
                                                .sessionRegistry(sessionRegistry));

                return http.build();
        }

        private static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
                private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
                private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

                @Override
                public void handle(HttpServletRequest request, HttpServletResponse response,
                                Supplier<CsrfToken> csrfToken) {
                        this.xor.handle(request, response, csrfToken);
                }

                @Override
                public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
                        String headerValue = request.getHeader(csrfToken.getHeaderName());
                        return (StringUtils.hasText(headerValue) ? this.plain : this.xor)
                                        .resolveCsrfTokenValue(request, csrfToken);
                }
        }
}
