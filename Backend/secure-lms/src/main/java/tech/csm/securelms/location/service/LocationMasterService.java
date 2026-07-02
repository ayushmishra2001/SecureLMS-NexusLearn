package tech.csm.securelms.location.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.location.dto.LocationDto;
import tech.csm.securelms.location.dto.LocationAuditLogDto;
import tech.csm.securelms.location.entity.*;
import tech.csm.securelms.location.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LocationMasterService {

    @Autowired private CountryRepository countryRepository;
    @Autowired private StateRepository stateRepository;
    @Autowired private DistrictRepository districtRepository;
    @Autowired private BlockRepository blockRepository;
    @Autowired private PanchayatRepository panchayatRepository;
    @Autowired private VillageRepository villageRepository;
    @Autowired private LocationAuditLogRepository auditLogRepository;
    @Autowired private ObjectMapper objectMapper;

    public List<LocationAuditLogDto> getAllAuditLogs(String level) {
        return auditLogRepository.findByEntityTypeOrderByPerformedAtDesc(level.toUpperCase())
                .stream().map(log -> {
                    LocationAuditLogDto dto = new LocationAuditLogDto();
                    dto.setAuditId(log.getAuditId());
                    dto.setEntityType(log.getEntityType());
                    dto.setEntityId(log.getEntityId());
                    dto.setAction(log.getAction());
                    dto.setOldValue(log.getOldValue());
                    dto.setNewValue(log.getNewValue());
                    dto.setPerformedBy(log.getPerformedBy());
                    dto.setPerformedAt(log.getPerformedAt());
                    return dto;
                }).collect(Collectors.toList());
    }

    public List<LocationAuditLogDto> getAuditLogs(String level, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(level.toUpperCase(), entityId)
                .stream().map(log -> {
                    LocationAuditLogDto dto = new LocationAuditLogDto();
                    dto.setAuditId(log.getAuditId());
                    dto.setEntityType(log.getEntityType());
                    dto.setEntityId(log.getEntityId());
                    dto.setAction(log.getAction());
                    dto.setOldValue(log.getOldValue());
                    dto.setNewValue(log.getNewValue());
                    dto.setPerformedBy(log.getPerformedBy());
                    dto.setPerformedAt(log.getPerformedAt());
                    return dto;
                }).collect(Collectors.toList());
    }

    private void logAuditAction(String level, Long entityId, String action, Object oldValue, Object newValue) {
        try {
            LocationAuditLog log = new LocationAuditLog();
            log.setEntityType(level.toUpperCase());
            log.setEntityId(entityId);
            log.setAction(action);
            log.setOldValue(oldValue != null ? objectMapper.writeValueAsString(oldValue) : null);
            log.setNewValue(newValue != null ? objectMapper.writeValueAsString(newValue) : null);
            
            String username = "SYSTEM";
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                username = auth.getName();
            }
            log.setPerformedBy(username);
            
            auditLogRepository.save(log);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<LocationDto> getLocations(String level, Long parentId, String status) {
        switch (level.toLowerCase()) {
            case "country":
                return (status != null ? countryRepository.findByStatus(status) : countryRepository.findAll())
                        .stream().map(this::mapCountry).collect(Collectors.toList());
            case "state":
                return (status != null ? stateRepository.findByCountryIdAndStatus(parentId, status) : stateRepository.findAll())
                        .stream().filter(s -> parentId == null || s.getCountry().getId().equals(parentId))
                        .map(this::mapState).collect(Collectors.toList());
            case "district":
                return (status != null ? districtRepository.findByStateIdAndStatus(parentId, status) : districtRepository.findAll())
                        .stream().filter(d -> parentId == null || d.getState().getId().equals(parentId))
                        .map(this::mapDistrict).collect(Collectors.toList());
            case "block":
                return (status != null ? blockRepository.findByDistrictIdAndStatus(parentId, status) : blockRepository.findAll())
                        .stream().filter(b -> parentId == null || b.getDistrict().getId().equals(parentId))
                        .map(this::mapBlock).collect(Collectors.toList());
            case "panchayat":
                return (status != null ? panchayatRepository.findByBlockIdAndStatus(parentId, status) : panchayatRepository.findAll())
                        .stream().filter(p -> parentId == null || p.getBlock().getId().equals(parentId))
                        .map(this::mapPanchayat).collect(Collectors.toList());
            case "village":
                return (status != null ? villageRepository.findByPanchayatIdAndStatus(parentId, status) : villageRepository.findAll())
                        .stream().filter(v -> parentId == null || v.getPanchayat().getId().equals(parentId))
                        .map(this::mapVillage).collect(Collectors.toList());
            default:
                throw new IllegalArgumentException("Unknown level: " + level);
        }
    }

    public LocationDto saveLocation(String level, LocationDto dto) {
        validateName(dto.getName());
        LocationDto savedDto = null;
        switch (level.toLowerCase()) {
            case "country":
                if (countryRepository.existsByCodeIgnoreCase(dto.getCode())) throw new IllegalArgumentException("Code must be unique");
                if (countryRepository.existsByNameIgnoreCase(dto.getName())) throw new IllegalArgumentException("Name must be unique");
                Country c = new Country();
                c.setCode(dto.getCode());
                c.setName(dto.getName());
                c.setStatus(dto.getStatus());
                savedDto = mapCountry(countryRepository.save(c));
                break;
            case "state":
                if (stateRepository.existsByCodeIgnoreCase(dto.getCode())) throw new IllegalArgumentException("Code must be unique");
                if (stateRepository.existsByNameIgnoreCaseAndCountry_Id(dto.getName(), dto.getCountryId())) throw new IllegalArgumentException("Name must be unique");
                State s = new State();
                s.setCode(dto.getCode());
                s.setName(dto.getName());
                s.setStatus(dto.getStatus());
                s.setCountry(countryRepository.findById(dto.getParentId()).orElseThrow());
                savedDto = mapState(stateRepository.save(s));
                break;
            case "district":
                if (districtRepository.existsByCodeIgnoreCase(dto.getCode())) throw new IllegalArgumentException("Code must be unique");
                if (districtRepository.existsByNameIgnoreCaseAndState_Id(dto.getName(), dto.getStateId())) throw new IllegalArgumentException("Name must be unique");
                District d = new District();
                d.setCode(dto.getCode());
                d.setName(dto.getName());
                d.setStatus(dto.getStatus());
                State state = stateRepository.findById(dto.getParentId()).orElseThrow();
                d.setState(state);
                d.setCountryId(state.getCountry().getId());
                savedDto = mapDistrict(districtRepository.save(d));
                break;
            case "block":
                if (blockRepository.existsByCodeIgnoreCase(dto.getCode())) throw new IllegalArgumentException("Code must be unique");
                if (blockRepository.existsByNameIgnoreCaseAndDistrict_Id(dto.getName(), dto.getDistrictId())) throw new IllegalArgumentException("Name must be unique");
                Block b = new Block();
                b.setCode(dto.getCode());
                b.setName(dto.getName());
                b.setStatus(dto.getStatus());
                District dist = districtRepository.findById(dto.getParentId()).orElseThrow();
                b.setDistrict(dist);
                b.setStateId(dist.getState().getId());
                b.setCountryId(dist.getCountryId());
                savedDto = mapBlock(blockRepository.save(b));
                break;
            case "panchayat":
                if (panchayatRepository.existsByCodeIgnoreCase(dto.getCode())) throw new IllegalArgumentException("Code must be unique");
                if (panchayatRepository.existsByNameIgnoreCaseAndBlock_Id(dto.getName(), dto.getBlockId())) throw new IllegalArgumentException("Name must be unique");
                Panchayat p = new Panchayat();
                p.setCode(dto.getCode());
                p.setName(dto.getName());
                p.setStatus(dto.getStatus());
                Block blk = blockRepository.findById(dto.getParentId()).orElseThrow();
                p.setBlock(blk);
                p.setDistrictId(blk.getDistrict().getId());
                p.setStateId(blk.getStateId());
                p.setCountryId(blk.getCountryId());
                savedDto = mapPanchayat(panchayatRepository.save(p));
                break;
            case "village":
                if (villageRepository.existsByNameIgnoreCaseAndPanchayat_Id(dto.getName(), dto.getPanchayatId())) throw new IllegalArgumentException("Name must be unique");
                Village v = new Village();
                v.setName(dto.getName());
                v.setStatus(dto.getStatus());
                v.setPinCode(dto.getPinCode());
                Panchayat pan = panchayatRepository.findById(dto.getParentId()).orElseThrow();
                v.setPanchayat(pan);
                v.setBlockId(pan.getBlock().getId());
                v.setDistrictId(pan.getDistrictId());
                v.setStateId(pan.getStateId());
                v.setCountryId(pan.getCountryId());
                savedDto = mapVillage(villageRepository.save(v));
                break;
            default:
                throw new IllegalArgumentException("Unknown level: " + level);
        }
        logAuditAction(level, savedDto.getId(), "CREATE", null, savedDto);
        return savedDto;
    }

    public LocationDto updateLocation(String level, Long id, LocationDto dto) {
        validateName(dto.getName());
        LocationDto oldDto = null;
        LocationDto savedDto = null;
        switch (level.toLowerCase()) {
            case "country":
                if (countryRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode(), id)) throw new IllegalArgumentException("Code must be unique");
                if (countryRepository.existsByNameIgnoreCaseAndIdNot(dto.getName(), id)) throw new IllegalArgumentException("Name must be unique");
                Country c = countryRepository.findById(id).orElseThrow();
                oldDto = mapCountry(c);
                c.setCode(dto.getCode());
                c.setName(dto.getName());
                c.setStatus(dto.getStatus());
                savedDto = mapCountry(countryRepository.save(c));
                break;
            case "state":
                if (stateRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode(), id)) throw new IllegalArgumentException("Code must be unique");
                if (stateRepository.existsByNameIgnoreCaseAndCountry_IdAndIdNot(dto.getName(), dto.getCountryId(), id)) throw new IllegalArgumentException("Name must be unique");
                State s = stateRepository.findById(id).orElseThrow();
                oldDto = mapState(s);
                s.setCode(dto.getCode());
                s.setName(dto.getName());
                s.setStatus(dto.getStatus());
                if(dto.getParentId() != null) {
                    s.setCountry(countryRepository.findById(dto.getParentId()).orElseThrow());
                }
                savedDto = mapState(stateRepository.save(s));
                break;
            case "district":
                if (districtRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode(), id)) throw new IllegalArgumentException("Code must be unique");
                if (districtRepository.existsByNameIgnoreCaseAndState_IdAndIdNot(dto.getName(), dto.getStateId(), id)) throw new IllegalArgumentException("Name must be unique");
                District d = districtRepository.findById(id).orElseThrow();
                oldDto = mapDistrict(d);
                d.setCode(dto.getCode());
                d.setName(dto.getName());
                d.setStatus(dto.getStatus());
                if(dto.getParentId() != null && !d.getState().getId().equals(dto.getParentId())) {
                    State state = stateRepository.findById(dto.getParentId()).orElseThrow();
                    d.setState(state);
                    d.setCountryId(state.getCountry().getId());
                }
                savedDto = mapDistrict(districtRepository.save(d));
                break;
            case "block":
                if (blockRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode(), id)) throw new IllegalArgumentException("Code must be unique");
                if (blockRepository.existsByNameIgnoreCaseAndDistrict_IdAndIdNot(dto.getName(), dto.getDistrictId(), id)) throw new IllegalArgumentException("Name must be unique");
                Block b = blockRepository.findById(id).orElseThrow();
                oldDto = mapBlock(b);
                b.setCode(dto.getCode());
                b.setName(dto.getName());
                b.setStatus(dto.getStatus());
                if(dto.getParentId() != null && !b.getDistrict().getId().equals(dto.getParentId())) {
                    District dist = districtRepository.findById(dto.getParentId()).orElseThrow();
                    b.setDistrict(dist);
                    b.setStateId(dist.getState().getId());
                    b.setCountryId(dist.getCountryId());
                }
                savedDto = mapBlock(blockRepository.save(b));
                break;
            case "panchayat":
                if (panchayatRepository.existsByCodeIgnoreCaseAndIdNot(dto.getCode(), id)) throw new IllegalArgumentException("Code must be unique");
                if (panchayatRepository.existsByNameIgnoreCaseAndBlock_IdAndIdNot(dto.getName(), dto.getBlockId(), id)) throw new IllegalArgumentException("Name must be unique");
                Panchayat p = panchayatRepository.findById(id).orElseThrow();
                oldDto = mapPanchayat(p);
                p.setCode(dto.getCode());
                p.setName(dto.getName());
                p.setStatus(dto.getStatus());
                if(dto.getParentId() != null && !p.getBlock().getId().equals(dto.getParentId())) {
                    Block blk = blockRepository.findById(dto.getParentId()).orElseThrow();
                    p.setBlock(blk);
                    p.setDistrictId(blk.getDistrict().getId());
                    p.setStateId(blk.getStateId());
                    p.setCountryId(blk.getCountryId());
                }
                savedDto = mapPanchayat(panchayatRepository.save(p));
                break;
            case "village":
                Village v = villageRepository.findById(id).orElseThrow();
                oldDto = mapVillage(v);
                v.setName(dto.getName());
                v.setStatus(dto.getStatus());
                if(dto.getParentId() != null && !v.getPanchayat().getId().equals(dto.getParentId())) {
                    Panchayat pan = panchayatRepository.findById(dto.getParentId()).orElseThrow();
                    v.setPanchayat(pan);
                    v.setBlockId(pan.getBlock().getId());
                    v.setDistrictId(pan.getDistrictId());
                    v.setStateId(pan.getStateId());
                    v.setCountryId(pan.getCountryId());
                }
                savedDto = mapVillage(villageRepository.save(v));
                break;
            default:
                throw new IllegalArgumentException("Unknown level: " + level);
        }
        logAuditAction(level, id, "UPDATE", oldDto, savedDto);
        return savedDto;
    }

    public void deleteLocation(String level, Long id) {
        LocationDto oldDto = null;
        LocationDto savedDto = null;
        // Soft delete implementation
        switch (level.toLowerCase()) {
            case "country":
                Country c = countryRepository.findById(id).orElseThrow();
                oldDto = mapCountry(c);
                c.setStatus("INACTIVE");
                savedDto = mapCountry(countryRepository.save(c));
                break;
            case "state":
                State s = stateRepository.findById(id).orElseThrow();
                oldDto = mapState(s);
                s.setStatus("INACTIVE");
                savedDto = mapState(stateRepository.save(s));
                break;
            case "district":
                District d = districtRepository.findById(id).orElseThrow();
                oldDto = mapDistrict(d);
                d.setStatus("INACTIVE");
                savedDto = mapDistrict(districtRepository.save(d));
                break;
            case "block":
                Block b = blockRepository.findById(id).orElseThrow();
                oldDto = mapBlock(b);
                b.setStatus("INACTIVE");
                savedDto = mapBlock(blockRepository.save(b));
                break;
            case "panchayat":
                Panchayat p = panchayatRepository.findById(id).orElseThrow();
                oldDto = mapPanchayat(p);
                p.setStatus("INACTIVE");
                savedDto = mapPanchayat(panchayatRepository.save(p));
                break;
            case "village":
                Village v = villageRepository.findById(id).orElseThrow();
                oldDto = mapVillage(v);
                v.setStatus("INACTIVE");
                savedDto = mapVillage(villageRepository.save(v));
                break;
            default:
                throw new IllegalArgumentException("Unknown level: " + level);
        }
        logAuditAction(level, id, "DEACTIVATE", oldDto, savedDto);
    }

    private void validateName(String name) {
        if (name == null || !name.matches("^[a-zA-Z ]+$")) {
            throw new IllegalArgumentException("Name can only contain alphabetic characters and spaces.");
        }
    }

    // Mapping methods
    private LocationDto mapCountry(Country c) {
        LocationDto dto = new LocationDto();
        dto.setId(c.getId()); dto.setCode(c.getCode()); dto.setName(c.getName()); dto.setStatus(c.getStatus());
        dto.setCountryId(c.getId());
        return dto;
    }
    private LocationDto mapState(State s) {
        LocationDto dto = new LocationDto();
        dto.setId(s.getId()); dto.setCode(s.getCode()); dto.setName(s.getName()); dto.setStatus(s.getStatus());
        dto.setParentId(s.getCountry().getId()); dto.setCountryId(s.getCountry().getId()); dto.setStateId(s.getId());
        return dto;
    }
    private LocationDto mapDistrict(District d) {
        LocationDto dto = new LocationDto();
        dto.setId(d.getId()); dto.setCode(d.getCode()); dto.setName(d.getName()); dto.setStatus(d.getStatus());
        dto.setParentId(d.getState().getId()); dto.setCountryId(d.getCountryId()); dto.setStateId(d.getState().getId()); dto.setDistrictId(d.getId());
        return dto;
    }
    private LocationDto mapBlock(Block b) {
        LocationDto dto = new LocationDto();
        dto.setId(b.getId()); dto.setCode(b.getCode()); dto.setName(b.getName()); dto.setStatus(b.getStatus());
        dto.setParentId(b.getDistrict().getId()); dto.setCountryId(b.getCountryId()); dto.setStateId(b.getStateId()); dto.setDistrictId(b.getDistrict().getId()); dto.setBlockId(b.getId());
        return dto;
    }
    private LocationDto mapPanchayat(Panchayat p) {
        LocationDto dto = new LocationDto();
        dto.setId(p.getId()); dto.setCode(p.getCode()); dto.setName(p.getName()); dto.setStatus(p.getStatus());
        dto.setParentId(p.getBlock().getId()); dto.setCountryId(p.getCountryId()); dto.setStateId(p.getStateId()); dto.setDistrictId(p.getDistrictId()); dto.setBlockId(p.getBlock().getId()); dto.setPanchayatId(p.getId());
        return dto;
    }
    private LocationDto mapVillage(Village v) {
        LocationDto dto = new LocationDto();
        dto.setId(v.getId()); dto.setName(v.getName()); dto.setStatus(v.getStatus());
        dto.setPinCode(v.getPinCode());
        dto.setParentId(v.getPanchayat().getId()); dto.setCountryId(v.getCountryId()); dto.setStateId(v.getStateId()); dto.setDistrictId(v.getDistrictId()); dto.setBlockId(v.getBlockId()); dto.setPanchayatId(v.getPanchayat().getId());
        return dto;
    }
    

    private String generateBlockCode() {
        java.util.Random rnd = new java.util.Random();
        String code;
        do {
            code = "BLK" + (1000000 + rnd.nextInt(9000000));
        } while (blockRepository.existsByCodeIgnoreCase(code));
        return code;
    }

    private String generatePanchayatCode() {
        java.util.Random rnd = new java.util.Random();
        String code;
        do {
            code = "PNCHT" + (10000000 + rnd.nextInt(90000000));
        } while (panchayatRepository.existsByCodeIgnoreCase(code));
        return code;
    }
}



