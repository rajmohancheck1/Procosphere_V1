package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.response.UserResponse;
import com.cts.mfrp.procuresphere.exception.BadRequestException;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.Role;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<UserResponse> getAll() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    public UserResponse getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return toResponse(user);
    }

    public UserResponse getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateRole(Long id, String roleStr) {
        if (roleStr == null || roleStr.isBlank()) {
            throw new BadRequestException("Role is required");
        }
        Role role;
        try {
            role = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + roleStr + ". Valid values: ADMIN, MANAGER, USER, SUPPLIER");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setRole(role);
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .department(user.getDepartment())
                .company(user.getCompany())
                .build();
    }
}
