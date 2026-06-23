package tech.csm.securelms.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicLong;

@Service
public class NavbarCacheService {
    private final AtomicLong version = new AtomicLong(0);

    public long currentVersion() {
        return version.get();
    }

    public void invalidateAll() {
        version.incrementAndGet();
    }
}

