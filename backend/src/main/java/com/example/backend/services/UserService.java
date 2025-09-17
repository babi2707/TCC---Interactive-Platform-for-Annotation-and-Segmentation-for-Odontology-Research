package com.example.backend.services;

import com.example.backend.entities.User;
import com.example.backend.interfaces.IUserService;
import com.example.backend.repositories.UserRepository;
import com.example.backend.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService implements IUserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public User register(String name, String email, String password, String role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists.");
        }

        String encodedPassword = passwordEncoder.encode(password);

        User user = new User(name, email, encodedPassword, role);

        return  userRepository.save(user);
    }

    @Override
    public ResponseEntity<?> login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponseDTO("Invalid email or password"));
        }

        User user = userOpt.get();

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        return ResponseEntity.ok(new LoginResponseDTO(token));
    }

}
