package com.birdhab.auth.domain.service;

import com.birdhab.auth.domain.entity.Address;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Logique métier de l'authentification : inscription, connexion, renouvellement
 * et révocation des jetons.
 */
@Service
@Transactional
public class AuthService {

    /**
     * Hash BCrypt valide ne correspondant à aucun mot de passe réel, utilisé
     * uniquement pour que {@code login} effectue un travail de vérification
     * de coût comparable que l'email existe ou non (voir {@link #login}).
     */
    private static final String DUMMY_PASSWORD_HASH =
            "$2a$10$C6UzMDM.H6dfI/f/IKcEeO7hTUizNCTQZQOEQBudZG.rFJEkkkbrO";

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
     * <p>Effectue toujours une vérification BCrypt, même si l'email n'existe
     * pas (contre un hash factice {@link #DUMMY_PASSWORD_HASH}), pour que le
     * temps de réponse ne permette pas de déduire quels emails sont
     * enregistrés (canal temporel).</p>
     *
     * @throws InvalidCredentialsException si l'email ou le mot de passe est incorrect
     * @throws AccountDisabledException    si le compte est désactivé
     */
    public TokenPair login(String email, String rawPassword) {
        Optional<User> maybeUser = userRepository.findByEmail(normalizeEmail(email));
        String hashToCheck = maybeUser.map(User::getPasswordHash).orElse(DUMMY_PASSWORD_HASH);
        boolean passwordMatches = passwordEncoder.matches(rawPassword, hashToCheck);

        if (maybeUser.isEmpty() || !passwordMatches) {
            throw new InvalidCredentialsException();
        }

        User user = maybeUser.get();
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

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hashToken(refreshTokenValue))
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
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hashToken(refreshTokenValue))
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

    /**
     * Remplace intégralement le prénom/nom/adresse de l'utilisateur
     * authentifié (pas de correctif partiel champ par champ).
     *
     * @throws UserNotFoundException si l'utilisateur n'existe plus
     */
    public User updateProfile(UUID userId, String firstName, String lastName, Address address) {
        User user = getCurrentUser(userId);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setAddress(address);
        return userRepository.save(user);
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
        refreshTokenRepository.save(new RefreshToken(user, hashToken(refreshTokenValue), expiresAt));

        return new TokenPair(accessToken, refreshTokenValue, jwtService.getAccessTokenExpirationSeconds());
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase();
    }

    /**
     * Hash SHA-256 (hexadécimal) d'un refresh token, seule forme persistée
     * en base (voir {@link RefreshToken}). Un hash rapide suffit ici : le
     * jeton d'origine est un JWT à haute entropie, pas un secret choisi par
     * un humain — contrairement aux mots de passe (BCrypt), il n'y a pas de
     * risque de brute-force à ralentir.
     */
    private static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 non disponible", e);
        }
    }
}
