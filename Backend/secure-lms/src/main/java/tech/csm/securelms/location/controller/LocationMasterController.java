package tech.csm.securelms.location.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.location.dto.LocationDto;
import tech.csm.securelms.location.dto.LocationAuditLogDto;
import org.springframework.web.multipart.MultipartFile;
import tech.csm.securelms.location.service.LocationImportService;
import java.util.Map;
import tech.csm.securelms.location.service.LocationMasterService;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
public class LocationMasterController {
    @Autowired
    private LocationImportService locationImportService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadLocations(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = locationImportService.importCsv(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Error importing CSV: " + e.getMessage()));
        }
    }

    @Autowired
    private LocationMasterService locationMasterService;

    @GetMapping("/{level}")
    public ResponseEntity<List<LocationDto>> getLocations(
            @PathVariable String level,
            @RequestParam(required = false) Long parentId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(locationMasterService.getLocations(level, parentId, status));
    }

    @PostMapping("/{level}")
    public ResponseEntity<LocationDto> saveLocation(
            @PathVariable String level,
            @RequestBody LocationDto dto) {
        return ResponseEntity.ok(locationMasterService.saveLocation(level, dto));
    }

    @PutMapping("/{level}/{id}")
    public ResponseEntity<LocationDto> updateLocation(
            @PathVariable String level,
            @PathVariable Long id,
            @RequestBody LocationDto dto) {
        return ResponseEntity.ok(locationMasterService.updateLocation(level, id, dto));
    }

    @DeleteMapping("/{level}/{id}")
    public ResponseEntity<Void> deleteLocation(
            @PathVariable String level,
            @PathVariable Long id) {
        locationMasterService.deleteLocation(level, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{level}/audit")
    public ResponseEntity<List<LocationAuditLogDto>> getAllAuditLogs(
            @PathVariable String level) {
        return ResponseEntity.ok(locationMasterService.getAllAuditLogs(level));
    }

    @GetMapping("/{level}/{id}/audit")
    public ResponseEntity<List<LocationAuditLogDto>> getAuditLogs(
            @PathVariable String level,
            @PathVariable Long id) {
        return ResponseEntity.ok(locationMasterService.getAuditLogs(level, id));
    }
}


