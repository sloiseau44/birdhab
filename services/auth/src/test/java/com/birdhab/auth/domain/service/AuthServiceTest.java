package com.birdhab.auth.domain.service;

import com.birdhab.auth.domain.entity.RefreshToken;
import com.birdhab.auth.domain.entity.Role;
import com.birdhab.auth.domain.entity.RoleName;
import com.birdhab.auth.domain.entity.User;
import com.birdhab.auth.domain.exception.AccountDisabledException;
import com.birdhab.auth.domain.exception.EmailAlreadyExistsException;
import com.birdhab.auth.domain.exception.InvalidCredentialsException;
import com.birdhab.auth.domain.exception.InvalidRefreshTokenException;
import com.birdhab.auth.domain.exception.UserNotFoundException;
import com.birdhab.auth.domain.repository.RefreshTokenRepository;
import com.birdhab.auth.domain.repository.RoleRepository;
import com.birdhab.auth.domain.repository.UserRepository;
import com.birdhab.auth.infrastructure.jwt.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "proprietaire@example.com";
    private static final String RAW_PASSWORD = "MotDePasseSolide123!";
    private static final String PASSWORD_HASH = "$2a$10$hashed";

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Claims claims;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, roleRepository, refreshTokenRepository, jwtService, passwordEncoder);
    }

    private User userWithId(UUID id, boolean enabled) {
        User user = new User(EMAIL, PASSWORD_HASH);
        user.setEnabled(enabled);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private void stubTokenIssuance() {
        when(jwtService.generateAccessToken(any(User.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(User.class))).thenReturn("refresh-token");
        when(jwtService.getRefreshTokenExpirationMs()).thenReturn(2_592_000_000L);
        when(jwtService.getAccessTokenExpirationSeconds()).thenReturn(900L);
    }

    // --- register ---

    @Test
    void register_nominal_createsUserWithOwnerRoleAndIssuesTokens() {
        Role ownerRole = new Role(RoleName.OWNER);
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(roleRepository.findByName(RoleName.OWNER)).thenReturn(Optional.of(ownerRole));
        stubTokenIssuance();

        TokenPair result = authService.register(EMAIL, RAW_PASSWORD, "Stéphane", "Loiseau");

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.expiresInSeconds()).isEqualTo(900L);

        verify(userRepository).save(argThatUserHasRole(RoleName.OWNER));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void register_normalizesEmailCaseAndWhitespace() {
        when(userRepository.existsByEmail("proprietaire@example.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(roleRepository.findByName(RoleName.OWNER)).thenReturn(Optional.of(new Role(RoleName.OWNER)));
        stubTokenIssuance();

        authService.register("  Proprietaire@Example.com  ", RAW_PASSWORD, null, null);

        verify(userRepository).existsByEmail("proprietaire@example.com");
    }

    @Test
    void register_emailAlreadyExists_throwsAndDoesNotSave() {
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        assertThatThrownBy(() -> authService.register(EMAIL, RAW_PASSWORD, null, null))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(userRepository, never()).save(any());
    }

    // --- login ---

    @Test
    void login_nominal_issuesTokens() {
        User user = userWithId(UUID.randomUUID(), true);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);
        stubTokenIssuance();

        TokenPair result = authService.login(EMAIL, RAW_PASSWORD);

        assertThat(result.accessToken()).isEqualTo("access-token");
    }

    @Test
    void login_unknownEmail_throwsInvalidCredentials() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(EMAIL, RAW_PASSWORD))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        User user = userWithId(UUID.randomUUID(), true);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(false);

        assertThatThrownBy(() -> authService.login(EMAIL, RAW_PASSWORD))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_disabledAccount_throwsAccountDisabled() {
        User user = userWithId(UUID.randomUUID(), false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);

        assertThatThrownBy(() -> authService.login(EMAIL, RAW_PASSWORD))
                .isInstanceOf(AccountDisabledException.class);
    }

    // --- refresh ---

    @Test
    void refresh_nominal_revokesOldAndIssuesNewTokens() {
        User user = userWithId(UUID.randomUUID(), true);
        RefreshToken stored = new RefreshToken(user, "old-refresh", Instant.now().plusSeconds(3600));

        when(jwtService.parseClaims("old-refresh")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(true);
        when(refreshTokenRepository.findByToken("old-refresh")).thenReturn(Optional.of(stored));
        stubTokenIssuance();

        TokenPair result = authService.refresh("old-refresh");

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(stored.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(stored);
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void refresh_malformedJwt_throwsInvalidRefreshToken() {
        when(jwtService.parseClaims("garbage")).thenThrow(new JwtException("bad signature"));

        assertThatThrownBy(() -> authService.refresh("garbage"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(refreshTokenRepository, never()).findByToken(anyString());
    }

    @Test
    void refresh_wrongTokenType_throwsInvalidRefreshToken() {
        when(jwtService.parseClaims("access-token-used-as-refresh")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("access-token-used-as-refresh"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_notPersisted_throwsInvalidRefreshToken() {
        when(jwtService.parseClaims("unknown")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(true);
        when(refreshTokenRepository.findByToken("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("unknown"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_revokedToken_throwsInvalidRefreshToken() {
        User user = userWithId(UUID.randomUUID(), true);
        RefreshToken stored = new RefreshToken(user, "revoked-token", Instant.now().plusSeconds(3600));
        stored.revoke();

        when(jwtService.parseClaims("revoked-token")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(true);
        when(refreshTokenRepository.findByToken("revoked-token")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh("revoked-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_expiredToken_throwsInvalidRefreshToken() {
        User user = userWithId(UUID.randomUUID(), true);
        RefreshToken stored = new RefreshToken(user, "expired-token", Instant.now().minusSeconds(3600));

        when(jwtService.parseClaims("expired-token")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(true);
        when(refreshTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh("expired-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refresh_disabledAccount_throwsInvalidRefreshToken() {
        User user = userWithId(UUID.randomUUID(), false);
        RefreshToken stored = new RefreshToken(user, "token-of-disabled-user", Instant.now().plusSeconds(3600));

        when(jwtService.parseClaims("token-of-disabled-user")).thenReturn(claims);
        when(jwtService.isRefreshToken(claims)).thenReturn(true);
        when(refreshTokenRepository.findByToken("token-of-disabled-user")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh("token-of-disabled-user"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    // --- logout ---

    @Test
    void logout_nominal_revokesToken() {
        UUID userId = UUID.randomUUID();
        User user = userWithId(userId, true);
        RefreshToken stored = new RefreshToken(user, "to-revoke", Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByToken("to-revoke")).thenReturn(Optional.of(stored));

        authService.logout("to-revoke", userId);

        assertThat(stored.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(stored);
    }

    @Test
    void logout_tokenNotFound_throwsInvalidRefreshToken() {
        when(refreshTokenRepository.findByToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.logout("missing", UUID.randomUUID()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void logout_tokenOwnedByAnotherUser_throwsInvalidRefreshToken() {
        User owner = userWithId(UUID.randomUUID(), true);
        RefreshToken stored = new RefreshToken(owner, "not-mine", Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByToken("not-mine")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.logout("not-mine", UUID.randomUUID()))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(refreshTokenRepository, never()).save(any());
    }

    // --- getCurrentUser ---

    @Test
    void getCurrentUser_found_returnsUser() {
        UUID userId = UUID.randomUUID();
        User user = userWithId(userId, true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User result = authService.getCurrentUser(userId);

        assertThat(result).isEqualTo(user);
    }

    @Test
    void getCurrentUser_notFound_throwsUserNotFound() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser(userId))
                .isInstanceOf(UserNotFoundException.class);
    }

    private User argThatUserHasRole(RoleName roleName) {
        return org.mockito.ArgumentMatchers.argThat(user ->
                user != null && user.getRoles().stream().anyMatch(r -> r.getName() == roleName));
    }
}
