package com.birdhab.auth.api;

import com.birdhab.auth.api.dto.AddressDto;
import com.birdhab.auth.api.dto.AuthResponse;
import com.birdhab.auth.api.dto.LoginRequest;
import com.birdhab.auth.api.dto.RefreshRequest;
import com.birdhab.auth.api.dto.RegisterRequest;
import com.birdhab.auth.api.dto.UpdateProfileRequest;
import com.birdhab.auth.api.dto.UserProfile;
import com.birdhab.auth.domain.entity.Address;
import com.birdhab.auth.domain.entity.Role;
import com.birdhab.auth.domain.entity.User;
import com.birdhab.auth.domain.service.AuthService;
import com.birdhab.auth.domain.service.TokenPair;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Endpoints d'authentification, conformes à {@code docs/api/auth.yml}.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        TokenPair tokens = authService.register(
                request.email(), request.password(), request.firstName(), request.lastName());
        return toAuthResponse(tokens);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        TokenPair tokens = authService.login(request.email(), request.password());
        return toAuthResponse(tokens);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        TokenPair tokens = authService.refresh(request.refreshToken());
        return toAuthResponse(tokens);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request, Authentication authentication) {
        authService.logout(request.refreshToken(), currentUserId(authentication));
    }

    @GetMapping("/me")
    public UserProfile me(Authentication authentication) {
        User user = authService.getCurrentUser(currentUserId(authentication));
        return toUserProfile(user);
    }

    @PutMapping("/me")
    public UserProfile updateMe(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        Address address = request.address() == null ? null
                : new Address(request.address().street(), request.address().postalCode(), request.address().city());
        User user = authService.updateProfile(currentUserId(authentication), request.firstName(),
                request.lastName(), address);
        return toUserProfile(user);
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private AuthResponse toAuthResponse(TokenPair tokens) {
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken(), tokens.expiresInSeconds());
    }

    private UserProfile toUserProfile(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getName).map(Enum::name).toList();
        AddressDto address = user.getAddress() == null ? null
                : new AddressDto(user.getAddress().getStreet(), user.getAddress().getPostalCode(),
                        user.getAddress().getCity());
        return new UserProfile(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), address, roles);
    }
}
