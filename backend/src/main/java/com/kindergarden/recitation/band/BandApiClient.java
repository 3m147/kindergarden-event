package com.kindergarden.recitation.band;

import com.fasterxml.jackson.databind.JsonNode;
import com.kindergarden.recitation.dto.BandOptionDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * 네이버 밴드 Open API 호출부. 응답 스키마가 확정되기 전이라 JsonNode 로 방어적으로 파싱한다.
 * (엔드포인트: https://developers.band.us/develop/guide/api)
 */
@Component
public class BandApiClient {

    private final RestClient api;
    private final RestClient auth;
    private final String authBaseUrl;

    public BandApiClient(
            @Value("${band.api-base-url:https://openapi.band.us}") String apiBaseUrl,
            @Value("${band.auth-base-url:https://auth.band.us}") String authBaseUrl) {
        this.api = RestClient.builder().baseUrl(apiBaseUrl).build();
        this.auth = RestClient.builder().baseUrl(authBaseUrl).build();
        this.authBaseUrl = authBaseUrl;
    }

    public record BandPhoto(String photoKey, String url, Long createdAtMillis, String author) {}
    public record DownloadedImage(byte[] bytes, String contentType) {}
    public record TokenResponse(String accessToken, String refreshToken) {}

    public String authorizeUrl(String clientId, String redirectUri) {
        return authBaseUrl + "/oauth2/authorize?response_type=code&client_id=" + enc(clientId)
                + "&redirect_uri=" + enc(redirectUri);
    }

    /** 내가 속한 밴드 목록. band_key 를 고르기 위함. */
    public List<BandOptionDto> listBands(String accessToken) {
        JsonNode root = api.get().uri(uri -> uri.path("/v2/bands").queryParam("access_token", accessToken).build())
                .retrieve().body(JsonNode.class);
        JsonNode bands = data(root).path("bands");
        List<BandOptionDto> out = new ArrayList<>();
        if (bands.isArray()) {
            for (JsonNode b : bands) out.add(new BandOptionDto(text(b, "band_key"), text(b, "name")));
        }
        return out;
    }

    /** 밴드의 앨범 목록. photo_album_key 를 고르기 위함. */
    public List<BandOptionDto> listAlbums(String accessToken, String bandKey) {
        JsonNode root = api.get().uri(uri -> uri.path("/v2/band/albums")
                        .queryParam("access_token", accessToken).queryParam("band_key", bandKey).build())
                .retrieve().body(JsonNode.class);
        JsonNode items = firstArray(data(root), "items", "albums");
        List<BandOptionDto> out = new ArrayList<>();
        for (JsonNode a : items) {
            String name = text(a, "name");
            if (name == null || name.isBlank()) name = "(제목 없는 앨범)";
            out.add(new BandOptionDto(text(a, "photo_album_key"), name));
        }
        return out;
    }

    /** 앨범 안의 사진 목록. 페이지네이션은 next_params 를 따라간다. */
    public List<BandPhoto> listPhotos(String accessToken, String bandKey, String albumKey) {
        List<BandPhoto> out = new ArrayList<>();
        String after = null;
        for (int page = 0; page < 20; page++) { // 안전 상한
            final String afterParam = after;
            JsonNode root = api.get().uri(uri -> {
                var u = uri.path("/v2/band/album/photos")
                        .queryParam("access_token", accessToken)
                        .queryParam("band_key", bandKey)
                        .queryParam("photo_album_key", albumKey)
                        .queryParam("limit", 100);
                if (afterParam != null && !afterParam.isBlank()) u.queryParam("after", afterParam);
                return u.build();
            }).retrieve().body(JsonNode.class);

            JsonNode dataNode = data(root);
            for (JsonNode p : firstArray(dataNode, "items", "photos")) {
                out.add(new BandPhoto(
                        text(p, "photo_key"),
                        text(p, "url"),
                        millis(p),
                        text(p.path("author"), "name")));
            }
            after = extractAfter(dataNode);
            if (after == null || after.isBlank()) break;
        }
        return out;
    }

    public DownloadedImage download(String url) {
        ResponseEntity<byte[]> res = RestClient.create().get().uri(url).retrieve().toEntity(byte[].class);
        MediaType ct = res.getHeaders().getContentType();
        return new DownloadedImage(res.getBody(), ct != null ? ct.toString() : MediaType.IMAGE_JPEG_VALUE);
    }

    public TokenResponse exchangeCodeForToken(String clientId, String clientSecret, String code, String redirectUri) {
        String basic = Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("code", code);
        form.add("redirect_uri", redirectUri);
        JsonNode root = auth.post().uri("/oauth2/token")
                .header("Authorization", "Basic " + basic)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve().body(JsonNode.class);
        return new TokenResponse(text(root, "access_token"), text(root, "refresh_token"));
    }

    // --- helpers -------------------------------------------------------------

    private static JsonNode data(JsonNode root) {
        return root == null ? com.fasterxml.jackson.databind.node.MissingNode.getInstance() : root.path("result_data");
    }

    private static JsonNode firstArray(JsonNode parent, String... names) {
        for (String n : names) {
            JsonNode node = parent.path(n);
            if (node.isArray()) return node;
        }
        return com.fasterxml.jackson.databind.node.MissingNode.getInstance();
    }

    private static String extractAfter(JsonNode dataNode) {
        JsonNode paging = dataNode.path("paging");
        JsonNode nextParams = paging.path("next_params");
        if (nextParams.isObject()) return text(nextParams, "after");
        // next_params 가 URL 문자열로 오는 변형도 방어
        return text(paging, "after");
    }

    private static Long millis(JsonNode p) {
        JsonNode c = p.path("created_at");
        if (c.isMissingNode() || c.isNull()) return null;
        if (c.isNumber()) return c.asLong();
        try { return Long.parseLong(c.asText().trim()); } catch (NumberFormatException e) { return null; }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private static String enc(String v) {
        return java.net.URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8);
    }
}
