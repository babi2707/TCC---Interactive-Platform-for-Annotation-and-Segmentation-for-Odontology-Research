package com.example.backend.services;

import com.example.backend.entities.User;
import com.example.backend.interfaces.IUserService;
import com.example.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService implements IUserService {
    private final UserRepository userRepository;

    protected UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public User register(String name, String email, String passwordHash, String role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists.");
        }

        User user = new User(name, email, passwordHash, role);

        return  userRepository.save(user);
    }

    @Override
    public String login(String email, String passwordHash) {
        Optional<User> user = userRepository.findByEmail(email);

        if(user.isEmpty()) {
            throw new RuntimeException("Credentials not found.");
        }

        return "Login realizado com sucesso para usuário: " + user.get().getEmail();
    }
}
