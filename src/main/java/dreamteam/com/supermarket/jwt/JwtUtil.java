package dreamteam.com.supermarket.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;


    private Key getSigningKey() {
        System.out.println("🔑 JWT Secret Key: " + secretKey);
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60)) // 1 час
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)  // ✅ Теперь подпись совпадает!
                .compact();
    }


    public String extractUsername(String token) {
        try {
            System.out.println("📢 JwtUtil: Parsing token: " + token);
            String username = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
            System.out.println("✅ JwtUtil: Extracted username: " + username);
            return username;
        } catch (ExpiredJwtException e) {
            System.out.println("❌ JwtUtil: Token expired!");
        } catch (UnsupportedJwtException e) {
            System.out.println("❌ JwtUtil: Unsupported JWT!");
        } catch (MalformedJwtException e) {
            System.out.println("❌ JwtUtil: Malformed JWT!");
        } catch (SignatureException e) {
            System.out.println("❌ JwtUtil: Invalid signature!");
        } catch (Exception e) {
            System.out.println("❌ JwtUtil: Unknown error while parsing token!");
            e.printStackTrace();
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            System.out.println("Проверка токена: " + token);
            System.out.println("Secret Key: " + secretKey);
            return true;
        } catch (ExpiredJwtException e) {
            System.out.println("❌ Token expired: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.out.println("❌ Unsupported JWT: " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.out.println("❌ Malformed JWT: " + e.getMessage());
        } catch (SignatureException e) {
            System.out.println("❌ Invalid signature: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("❌ Unknown error during token validation: " + e.getMessage());
        }
        return false;
    }
}
