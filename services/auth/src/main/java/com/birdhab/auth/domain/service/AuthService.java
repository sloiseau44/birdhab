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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Logique métier de l'authentification : inscription, connexion, renouvellement
 * et révocation des jetons.
 */
@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                        RoleRepository roleRepository,
                        RefreshTokenRepository refreshTokenRepository,
                        JwtService jwtService,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Crée un compte utilisateur avec le rôle {@link RoleName#OWNER} par défaut.
     *
     * @throws EmailAlreadyExistsException si l'email est déjà utilisé
     */
    public TokenPair register(String email, String rawPassword, String firstName, String lastName) {
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException(normalizedEmail);
        }

        User user = new User(normalizedEmail, passwordEncoder.encode(rawPassword));
        user.setFirstName(firstName);
        user.setLastName(lastName);

        Role ownerRole = roleRepository.findByName(RoleName.OWNER)
                .orElseThrow(() -> new IllegalStateException(
                        "Rôle OWNER introuvable en base — vérifier la migration V1__init_auth.sql"));
        user.addRole(ownerRole);

        userRepository.save(user);

        return issueTokens(user);
    }

    /**
     * Authentifie un utilisateur par email/mot de passe.
     *
     * @throws InvalidCredentialsException si l'email ou le mot de passe est incorrect
     * @throws AccountDisabledException    si le compte est désactivé
     */
    public TokenPair login(String email, String rawPassword) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (!user.isEnabled()) {
            throw new AccountDisabledException();
        }

        return issueTokens(user);
    }

    /**
     * Échange un refresh token valide contre un nouveau couple de jetons
     * (rotation : l'ancien refresh token est révoqué).
     *
     * @throws InvalidRefreshTokenException si le jeton est invalide, expiré,
     *                                      révoqué, ou si le compte associé est désactivé
     */
    public TokenPair refresh(String refreshTokenValue) {
        Claims claims = parseRefreshTokenClaims(refreshTokenValue);
        if (!jwtService.isRefreshToken(claims)) {
            throw new InvalidRefreshTokenException();
        }

        RefreshToken stored = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(InvalidRefreshTokenException::new);

        if (stored.isRevoked() || stored.isExpired()) {
            throw new InvalidRefreshTokenException();
        }

        User user = stored.getUser();
        if (!user.isEnabled()) {
            // Pas de réponse 403 prévue par le contrat pour /auth/refresh : traité comme jeton invalide.
            throw new InvalidRefreshTokenException();
        }

        stored.revoke();
        refreshTokenRepository.save(stored);

        return issueTokens(user);
    }

    /**
     * Révoque le refresh token fourni pour l'utilisateur authentifié.
     *
     * @throws InvalidRefreshTokenException si le jeton est introuvable ou
     *                                      n'appartient pas à l'utilisateur authentifié
     */
    public void logout(String refreshTokenValue, UUID authenticatedUserId) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(InvalidRefreshTokenException::new);

        if (!stored.getUser().getId().equals(authenticatedUserId)) {
            throw new InvalidRefreshTokenException();
        }

        stored.revoke();
        refreshTokenRepository.save(stored);
    }

    /**
     * Récupère le profil de l'utilisateur authentifié.
     *
     * @throws UserNotFoundException si l'utilisateur n'existe plus
     */
    @Transactional(readOnly = true)
    public User getCurrentUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(UserNotFoundException::new);
    }

    private Claims parseRefreshTokenClaims(String refreshTokenValue) {
        try {
            return jwtService.parseClaims(refreshTokenValue);
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidRefreshTokenException();
        }
    }

    private TokenPair issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenValue = jwtService.generateRefreshToken(user);

        Instant expiresAt = Instant.now().plusMillis(jwtService.getRefreshTokenExpirationMs());
        refreshTokenRepository.save(new RefreshToken(user, refreshTokenValue, expiresAt));

        return new TokenPair(accessToken, refreshTokenValue, jwtService.getAccessTokenExpirationSeconds());
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase();
    }
}
