package tech.csm.securelms.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WellKnownProbeController {

    @RequestMapping(
            value = { "/.well-known", "/.well-known/{*path}" },
            method = { RequestMethod.GET, RequestMethod.HEAD, RequestMethod.OPTIONS })
    public ResponseEntity<Void> wellKnownProbe() {
        // Browser/devtools probe endpoints. Return empty success to avoid noisy 500s.
        return ResponseEntity.noContent().build();
    }
}
