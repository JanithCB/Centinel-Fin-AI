package com.centinel.finai.controller;

import com.centinel.finai.dto.RegisterUserDTO;
import com.centinel.finai.dto.UserResponseDTO;
import com.centinel.finai.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> registerUser(
            @Valid @RequestBody RegisterUserDTO registerUserDTO,
            @AuthenticationPrincipal Jwt jwt) {
        UserResponseDTO response = userService.registerOrSyncUser(registerUserDTO, jwt);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        UserResponseDTO response = userService.getCurrentUserProfile(jwt);
        return ResponseEntity.ok(response);
    }
}
