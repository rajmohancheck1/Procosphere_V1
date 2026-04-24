package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.LoginRequest;
import com.cts.mfrp.procuresphere.dto.request.RegisterRequest;
import com.cts.mfrp.procuresphere.dto.response.AuthResponse;
import com.cts.mfrp.procuresphere.exception.BadRequestException;
import com.cts.mfrp.procuresphere.model.Role;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import com.cts.mfrp.procuresphere.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already registered");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                // All public self-registrations create a plain USER.
                // Admins promote users to MANAGER/ADMIN/SUPPLIER via PATCH /api/users/{id}/role.
                .role(Role.USER)
                .department(request.getDepartment())
                .company(request.getCompany())
                .address(request.getAddress())
                .avatarUrl(request.getAvatarUrl())
                .rememberMe(false)
                .build();

        userRepository.save(user);
        String token = jwtTokenProvider.generateToken(user.getEmail());
        return buildAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String token = jwtTokenProvider.generateToken(authentication);
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
