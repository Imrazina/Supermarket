package dreamteam.com.supermarket.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        System.out.println(" Новый запрос: " + request.getMethod() + " " + request.getRequestURI());

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            System.out.println(" Пропуск OPTIONS запроса");
            chain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null) {
            System.out.println(" Отсутствует заголовок Authorization");
            chain.doFilter(request, response);
            return;
        }

        if (!authHeader.startsWith("Bearer ")) {
            System.out.println("️ Неправильный формат заголовка Authorization: " + authHeader);
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        System.out.println(" Токен из заголовка: " + token);

        // Проверка валидности токена
        if (!jwtUtil.validateToken(token)) {
            System.out.println(" JWT не прошёл валидацию");
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
            return;
        }

        // Извлечение username
        String username = jwtUtil.extractUsername(token);
        System.out.println(" Извлечённый username: " + username);

        if (username == null || SecurityContextHolder.getContext().getAuthentication() != null) {
            System.out.println("️ Либо username null, либо уже аутентифицирован");
            chain.doFilter(request, response);
            return;
        }

        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            System.out.println(" Пользователь найден в системе: " + userDetails.getUsername());

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            System.out.println(" Аутентификация успешно установлена для пользователя: " + username);

        } catch (Exception e) {
            System.out.println(" Ошибка при загрузке пользователя или установке контекста: " + e.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
            return;
        }

        chain.doFilter(request, response);
    }
}
