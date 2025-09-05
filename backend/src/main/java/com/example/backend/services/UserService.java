package com.example.backend.services;

import com.example.backend.entities.User;
import com.example.backend.interfaces.IUserService;
import com.example.backend.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService implements IUserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    protected UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

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
    public String login(String email, String passwordHash) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email not found.");
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(passwordHash, user.getPasswordHash())) {
            throw new RuntimeException("Invalid password.");
        }

        return "Login realizado com sucesso para usuário: " + user.getEmail();
    }

}
