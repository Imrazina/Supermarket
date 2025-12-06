package dreamteam.com.supermarket.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LandingController {

    @GetMapping({"/", "/landing"})
    public String redirectToLanding() {
        return "redirect:/landing.html";
    }
}
