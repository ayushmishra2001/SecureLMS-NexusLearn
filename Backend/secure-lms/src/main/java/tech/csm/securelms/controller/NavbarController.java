package tech.csm.securelms.controller;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.NavbarGlobalGroupResponse;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.NavbarService;

import java.util.List;

@RestController
@RequestMapping("/api/navbar")
@RequiredArgsConstructor
public class NavbarController {

    private final NavbarService navbarService;

    @GetMapping("/menu")
    public ResponseEntity<ApiResponse<List<NavbarGlobalGroupResponse>>> getMenu(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpSession session) {
        List<NavbarGlobalGroupResponse> data = navbarService.getMenuForUser(principal.getId(), session);
        return ResponseEntity.ok(ApiResponse.success("Navbar menu fetched", data));
    }
}

