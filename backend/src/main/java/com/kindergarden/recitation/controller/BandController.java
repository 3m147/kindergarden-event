package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.band.BandSyncService;
import com.kindergarden.recitation.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// 네이버 밴드 연동 관리 (관리자 전용). /api/admin/** 는 SecurityConfig 에서 ADMIN 권한으로 보호된다.
@RestController
@RequestMapping("/api/admin/band")
@RequiredArgsConstructor
public class BandController {

    private final BandSyncService bandSyncService;

    @GetMapping("/config")
    public BandConfigDto config() { return bandSyncService.config(); }

    @PutMapping("/config")
    public BandConfigDto saveConfig(@RequestBody BandConfigRequest request) { return bandSyncService.saveConfig(request); }

    @GetMapping("/bands")
    public List<BandOptionDto> bands() { return bandSyncService.listBands(); }

    @GetMapping("/albums")
    public List<BandOptionDto> albums(@RequestParam String bandKey) { return bandSyncService.listAlbums(bandKey); }

    @PostMapping("/sync")
    public BandSyncResultDto sync() { return bandSyncService.sync(); }

    // OAuth (선택) — 프론트 관리자 페이지를 redirectUri 로 두고, 받은 code 를 여기로 넘겨 토큰으로 교환한다.
    @GetMapping("/authorize-url")
    public BandOptionDto authorizeUrl(@RequestParam String redirectUri) {
        return new BandOptionDto("url", bandSyncService.authorizeUrl(redirectUri));
    }

    @PostMapping("/exchange")
    public BandConfigDto exchange(@RequestBody ExchangeRequest request) {
        return bandSyncService.exchangeCode(request.code(), request.redirectUri());
    }

    public record ExchangeRequest(String code, String redirectUri) {}
}
