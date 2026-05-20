package com.example.backend.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "Backend online";
    }

    @GetMapping("/test")
    public String test() {
        return "API funcionando";
    }
}
