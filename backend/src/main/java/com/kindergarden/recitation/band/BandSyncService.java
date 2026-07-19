package com.kindergarden.recitation.band;

import com.kindergarden.recitation.dto.*;
import com.kindergarden.recitation.entity.BandIntegration;
import com.kindergarden.recitation.repository.BandIntegrationRepository;
import com.kindergarden.recitation.repository.WeeklyPhotoRepository;
import com.kindergarden.recitation.service.SharedContentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 밴드 앨범의 "이번 주" 사진을 주간 사진으로 동기화한다.
 * 설정(토큰/밴드/앨범)은 DB(BandIntegration) 한 행에 저장되고, 앱 재시작에도 유지된다.
 */
@Service
@RequiredArgsConstructor
public class BandSyncService {

    private static final Logger log = LoggerFactory.getLogger(BandSyncService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final BandIntegrationRepository repository;
    private final WeeklyPhotoRepository weeklyPhotoRepository;
    private final SharedContentService sharedContentService;
    private final BandApiClient bandApiClient;

    @Value("${band.client-id:}") private String clientId;
    @Value("${band.client-secret:}") private String clientSecret;

    // --- 설정 ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public BandConfigDto config() {
        BandIntegration b = find();
        boolean connected = b != null && b.getAccessToken() != null && !b.getAccessToken().isBlank();
        return new BandConfigDto(
                connected,
                b != null && b.isEnabled(),
                b == null ? null : b.getBandKey(),
                b == null ? null : b.getPhotoAlbumKey(),
                b == null ? null : b.getLastSyncedAt());
    }

    @Transactional
    public BandConfigDto saveConfig(BandConfigRequest request) {
        BandIntegration b = findOrCreate();
        if (request.accessToken() != null && !request.accessToken().isBlank()) {
            b.setAccessToken(request.accessToken().trim());
        }
        if (request.bandKey() != null) b.setBandKey(request.bandKey().trim());
        if (request.photoAlbumKey() != null) b.setPhotoAlbumKey(request.photoAlbumKey().trim());
        if (request.enabled() != null) b.setEnabled(request.enabled());
        repository.save(b);
        return config();
    }

    @Transactional
    public void storeToken(String accessToken, String refreshToken) {
        BandIntegration b = findOrCreate();
        b.setAccessToken(accessToken);
        if (refreshToken != null) b.setRefreshToken(refreshToken);
        repository.save(b);
    }

    // --- 선택 도우미 ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<BandOptionDto> listBands() {
        return bandApiClient.listBands(requireToken());
    }

    @Transactional(readOnly = true)
    public List<BandOptionDto> listAlbums(String bandKey) {
        return bandApiClient.listAlbums(requireToken(), bandKey);
    }

    public String authorizeUrl(String redirectUri) {
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("BAND_CLIENT_ID 가 설정되지 않았습니다.");
        }
        return bandApiClient.authorizeUrl(clientId, redirectUri);
    }

    @Transactional
    public BandConfigDto exchangeCode(String code, String redirectUri) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException("BAND_CLIENT_ID / BAND_CLIENT_SECRET 가 설정되지 않았습니다.");
        }
        BandApiClient.TokenResponse token = bandApiClient.exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
        if (token.accessToken() == null || token.accessToken().isBlank()) {
            throw new IllegalStateException("밴드에서 액세스 토큰을 받지 못했습니다.");
        }
        storeToken(token.accessToken(), token.refreshToken());
        return config();
    }

    // --- 동기화 -------------------------------------------------------------

    @Transactional
    public BandSyncResultDto sync() {
        BandIntegration b = find();
        if (b == null || !b.isEnabled()) return new BandSyncResultDto(0, 0, "밴드 연동이 꺼져 있습니다.");
        if (isBlank(b.getAccessToken())) return new BandSyncResultDto(0, 0, "밴드 액세스 토큰이 없습니다.");
        if (isBlank(b.getBandKey()) || isBlank(b.getPhotoAlbumKey())) {
            return new BandSyncResultDto(0, 0, "밴드/앨범이 선택되지 않았습니다.");
        }

        long weekStart = startOfThisWeekMillis();
        List<BandApiClient.BandPhoto> photos;
        try {
            photos = bandApiClient.listPhotos(b.getAccessToken(), b.getBandKey(), b.getPhotoAlbumKey());
        } catch (RuntimeException e) {
            log.warn("밴드 사진 목록 조회 실패", e);
            return new BandSyncResultDto(0, 0, "밴드 사진 목록을 불러오지 못했습니다: " + rootMessage(e));
        }

        int imported = 0, skipped = 0;
        for (BandApiClient.BandPhoto photo : photos) {
            if (isBlank(photo.photoKey()) || isBlank(photo.url())) { skipped++; continue; }
            // 날짜 정보가 있으면 "이번 주"만, 없으면 (중복 방지에 기대어) 새 사진을 받는다.
            if (photo.createdAtMillis() != null && photo.createdAtMillis() < weekStart) { skipped++; continue; }
            if (weeklyPhotoRepository.existsBySourcePhotoKey(photo.photoKey())) { skipped++; continue; }
            try {
                BandApiClient.DownloadedImage img = bandApiClient.download(photo.url());
                if (img.bytes() == null || img.bytes().length == 0) { skipped++; continue; }
                sharedContentService.importBandWeeklyPhoto(
                        buildTitle(photo), img.bytes(), photo.photoKey() + ".jpg", img.contentType(), photo.photoKey());
                imported++;
            } catch (RuntimeException e) {
                log.warn("밴드 사진 저장 실패 photoKey={}", photo.photoKey(), e);
                skipped++;
            }
        }

        b.setLastSyncedAt(LocalDateTime.now());
        repository.save(b);
        return new BandSyncResultDto(imported, skipped, "동기화 완료");
    }

    // --- helpers ------------------------------------------------------------

    private String buildTitle(BandApiClient.BandPhoto photo) {
        String datePart = photo.createdAtMillis() == null ? ""
                : " " + Instant.ofEpochMilli(photo.createdAtMillis()).atZone(KST).format(DateTimeFormatter.ofPattern("M/d"));
        String author = isBlank(photo.author()) ? "" : " " + photo.author();
        return ("밴드" + datePart + author).trim();
    }

    private static long startOfThisWeekMillis() {
        LocalDate monday = LocalDate.now(KST).with(DayOfWeek.MONDAY);
        return monday.atStartOfDay(KST).toInstant().toEpochMilli();
    }

    private String requireToken() {
        BandIntegration b = find();
        if (b == null || isBlank(b.getAccessToken())) throw new IllegalStateException("밴드 액세스 토큰이 없습니다.");
        return b.getAccessToken();
    }

    private BandIntegration find() { return repository.findAll().stream().findFirst().orElse(null); }

    private BandIntegration findOrCreate() {
        BandIntegration b = find();
        return b != null ? b : BandIntegration.builder().enabled(false).build();
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }

    private static String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null) t = t.getCause();
        return t.getMessage() == null ? t.getClass().getSimpleName() : t.getMessage();
    }
}
