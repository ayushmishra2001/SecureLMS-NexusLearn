package tech.csm.securelms.location.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tech.csm.securelms.location.dto.LocationDto;
import tech.csm.securelms.location.entity.*;
import tech.csm.securelms.location.repository.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;

@Service
public class LocationImportService {

    @Autowired private LocationMasterService locationMasterService;

    @Autowired private CountryRepository countryRepository;
    @Autowired private StateRepository stateRepository;
    @Autowired private DistrictRepository districtRepository;
    @Autowired private BlockRepository blockRepository;
    @Autowired private PanchayatRepository panchayatRepository;
    @Autowired private VillageRepository villageRepository;

    @Transactional
    public Map<String, Object> importCsv(MultipartFile file) throws Exception {
        Map<String, Object> response = new HashMap<>();
        int rowsProcessed = 0;

        try (BufferedReader fileReader = new BufferedReader(new InputStreamReader(file.getInputStream(), "UTF-8"));
             CSVParser csvParser = new CSVParser(fileReader,
                     CSVFormat.DEFAULT.withFirstRecordAsHeader().withIgnoreHeaderCase().withTrim())) {

            Iterable<CSVRecord> csvRecords = csvParser.getRecords();

            for (CSVRecord csvRecord : csvRecords) {
                String countryCode = csvRecord.isMapped("Country Code") ? csvRecord.get("Country Code") : null;
                String countryName = csvRecord.isMapped("Country Name") ? csvRecord.get("Country Name") : null;
                String stateCode = csvRecord.isMapped("State Code") ? csvRecord.get("State Code") : null;
                String stateName = csvRecord.isMapped("State Name") ? csvRecord.get("State Name") : null;
                String districtName = csvRecord.isMapped("District Name") ? csvRecord.get("District Name") : null;
                String blockName = csvRecord.isMapped("Block Name") ? csvRecord.get("Block Name") : null;
                String panchayatName = csvRecord.isMapped("Panchayat Name") ? csvRecord.get("Panchayat Name") : null;
                String villageName = csvRecord.isMapped("Village Name") ? csvRecord.get("Village Name") : null;
                String villagePincode = csvRecord.isMapped("Village Pincode") ? csvRecord.get("Village Pincode") : null;

                if (countryName == null || countryName.isEmpty()) continue;

                Long currentCountryId = processCountry(countryCode, countryName);

                if (stateName == null || stateName.isEmpty() || currentCountryId == null) { rowsProcessed++; continue; }
                Long currentStateId = processState(stateCode, stateName, currentCountryId);

                if (districtName == null || districtName.isEmpty() || currentStateId == null) { rowsProcessed++; continue; }
                Long currentDistrictId = processDistrict(districtName, currentStateId);

                if (blockName == null || blockName.isEmpty() || currentDistrictId == null) { rowsProcessed++; continue; }
                Long currentBlockId = processBlock(blockName, currentDistrictId);

                if (panchayatName == null || panchayatName.isEmpty() || currentBlockId == null) { rowsProcessed++; continue; }
                Long currentPanchayatId = processPanchayat(panchayatName, currentBlockId);

                if (villageName == null || villageName.isEmpty() || currentPanchayatId == null) { rowsProcessed++; continue; }
                processVillage(villageName, villagePincode, currentPanchayatId);

                rowsProcessed++;
            }
        }

        response.put("message", "Import successful");
        response.put("rowsProcessed", rowsProcessed);
        return response;
    }

    private Long processCountry(String code, String name) {
        Country existing = countryRepository.findByNameIgnoreCase(name).orElse(null);
        if (existing != null) return existing.getId();
        
        LocationDto dto = new LocationDto();
        dto.setCode(code != null && !code.isEmpty() ? code : name.substring(0, Math.min(name.length(), 2)).toUpperCase());
        dto.setName(name);
        dto.setStatus("ACTIVE");
        return locationMasterService.saveLocation("country", dto).getId();
    }

    private Long processState(String code, String name, Long countryId) {
        State existing = stateRepository.findByNameIgnoreCaseAndCountry_Id(name, countryId).orElse(null);
        if (existing != null) return existing.getId();

        LocationDto dto = new LocationDto();
        dto.setCode(code != null && !code.isEmpty() ? code : name.substring(0, Math.min(name.length(), 2)).toUpperCase());
        dto.setName(name);
        dto.setStatus("ACTIVE");
        dto.setParentId(countryId);
        dto.setCountryId(countryId);
        return locationMasterService.saveLocation("state", dto).getId();
    }

    private Long processDistrict(String name, Long stateId) {
        District existing = districtRepository.findByNameIgnoreCaseAndState_Id(name, stateId).orElse(null);
        if (existing != null) return existing.getId();

        LocationDto dto = new LocationDto();
        dto.setName(name);
        dto.setStatus("ACTIVE");
        dto.setParentId(stateId);
        State state = stateRepository.findById(stateId).orElseThrow();
        String code;
        do {
            code = state.getCode() + generateRandomNum(6);
        } while (districtRepository.existsByCodeIgnoreCase(code));
        dto.setCode(code);
        dto.setStateId(stateId);
        return locationMasterService.saveLocation("district", dto).getId();
    }

    private Long processBlock(String name, Long districtId) {
        Block existing = blockRepository.findByNameIgnoreCaseAndDistrict_Id(name, districtId).orElse(null);
        if (existing != null) return existing.getId();

        LocationDto dto = new LocationDto();
        dto.setName(name);
        dto.setStatus("ACTIVE");
        dto.setParentId(districtId);
        String code;
        do {
            code = "BLK" + generateRandomNum(7);
        } while (blockRepository.existsByCodeIgnoreCase(code));
        dto.setCode(code);
        dto.setDistrictId(districtId);
        return locationMasterService.saveLocation("block", dto).getId();
    }

    private Long processPanchayat(String name, Long blockId) {
        Panchayat existing = panchayatRepository.findByNameIgnoreCaseAndBlock_Id(name, blockId).orElse(null);
        if (existing != null) return existing.getId();

        LocationDto dto = new LocationDto();
        dto.setName(name);
        dto.setStatus("ACTIVE");
        dto.setParentId(blockId);
        String code;
        do {
            code = "PNCHT" + generateRandomNum(8);
        } while (panchayatRepository.existsByCodeIgnoreCase(code));
        dto.setCode(code);
        dto.setBlockId(blockId);
        return locationMasterService.saveLocation("panchayat", dto).getId();
    }

    private void processVillage(String name, String pinCode, Long panchayatId) {
        Village existing = villageRepository.findByNameIgnoreCaseAndPanchayat_Id(name, panchayatId).orElse(null);
        if (existing != null) return;

        LocationDto dto = new LocationDto();
        dto.setName(name);
        dto.setStatus("ACTIVE");
        dto.setParentId(panchayatId);
        dto.setPinCode(pinCode);
        dto.setPanchayatId(panchayatId);
        locationMasterService.saveLocation("village", dto);
    }

    private String generateRandomNum(int length) {
        StringBuilder result = new StringBuilder();
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < length; i++) {
            result.append(rnd.nextInt(10));
        }
        return result.toString();
    }
}
