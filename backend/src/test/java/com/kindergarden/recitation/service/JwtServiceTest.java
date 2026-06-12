package com.kindergarden.recitation.service;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    @Test
    void issuesSignedTokenWithRoleAndUserId() {
        SecretKey key = new SecretKeySpec(
                "test-secret-that-is-long-enough-for-hmac-sha256-signing".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
        JwtService service = new JwtService(new NimbusJwtEncoder(new ImmutableSecret<>(key)), 24);
        JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();

        String token = service.issueToken("park3-1", "TEACHER", 12L);
        var jwt = decoder.decode(token);

        assertThat(jwt.getSubject()).isEqualTo("park3-1");
        assertThat(jwt.getClaimAsStringList("roles")).isEqualTo(List.of("TEACHER"));
        assertThat(((Number) jwt.getClaim("userId")).longValue()).isEqualTo(12L);
    }
}
