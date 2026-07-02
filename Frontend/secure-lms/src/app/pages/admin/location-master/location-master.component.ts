import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { DashboardLayoutComponent } from '../../../shared/dashboard-layout/dashboard-layout.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { ApiService } from '../../../core/services/api.service';
import { ADMIN_NAV_GROUPS } from '../../../core/navigation/app-routes';
import { LocationMasterService, LocationDto, LocationAuditLogDto } from './location-master.service';

@Component({
  selector: 'app-location-master',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DashboardLayoutComponent, ConfirmDialogComponent, MatTabsModule, ModalComponent],
  templateUrl: './location-master.component.html',
  styleUrls: ['./location-master.component.scss']
})
export class LocationMasterComponent implements OnInit {
  navGroups = ADMIN_NAV_GROUPS;
  pageTitle = 'Location Master';
  activeSection = 'location_master'; // Will be set in route manually later

  locationService = inject(LocationMasterService);
  apiService = inject(ApiService);
  toast = inject(ToastService);
  fb = inject(FormBuilder);
  router = inject(Router);

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  levels = [
    { value: 'country', label: 'Country' },
    { value: 'state', label: 'State' },
    { value: 'district', label: 'District' },
    { value: 'block', label: 'Block' },
    { value: 'panchayat', label: 'Panchayat' },
    { value: 'village', label: 'Village' }
  ];

  selectedLevel = 'district'; // Default
  locations: LocationDto[] = [];
  
  // Dropdown data
  countries: LocationDto[] = [];
  states: LocationDto[] = [];
  districts: LocationDto[] = [];
  blocks: LocationDto[] = [];
  panchayats: LocationDto[] = [];

  form: FormGroup;
  isEdit = false;
  editingId: number | null = null;
  
  showConfirm = false;
  locationToDeactivate: LocationDto | null = null;

  // View Filters
  filterLevel = 'district';
  filterCountryId = '';
  filterStateId = '';
  filterDistrictId = '';
  filterBlockId = '';
  filterPanchayatId = '';

  // Audit State
  auditTabLevel = 'district';
  auditLogs: LocationAuditLogDto[] = [];

  constructor() {
    this.form = this.fb.group({
      level: ['district', Validators.required],
      countryId: ['', Validators.required],
      stateId: ['', Validators.required],
      districtId: [''],
      blockId: [''],
      panchayatId: [''],
      code: ['', Validators.required],
      name: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
      pinCode: [''],
      status: ['ACTIVE']
    });
  }

  ngOnInit() {
    this.loadCountries();
    this.onLevelChange('district'); // trigger validators
    this.loadViewData();
    this.loadAuditData();
    
    // Form value changes
    this.form.get('level')?.valueChanges.subscribe(val => {
      this.selectedLevel = val;
      this.onLevelChange(val);
    });
    this.form.get('countryId')?.valueChanges.subscribe(val => {
      if (val) this.loadStates(val);
      else this.states = [];
      if (!this.isEdit) {
        this.form.patchValue({ stateId: '', districtId: '', blockId: '', panchayatId: '' }, { emitEvent: false });
        this.districts = []; this.blocks = []; this.panchayats = [];
      }
    });
    this.form.get('stateId')?.valueChanges.subscribe(val => {
      if (val) {
        this.loadDistricts(val);
        if (!this.isEdit && this.selectedLevel === 'district') {
          const state = this.states.find(s => s.id == val);
          if (state) {
            this.form.patchValue({ code: state.code + this.generateRandomNum(6) });
          }
        }
      } else {
        this.districts = [];
      }
      if (!this.isEdit) {
        this.form.patchValue({ districtId: '', blockId: '', panchayatId: '' }, { emitEvent: false });
        this.blocks = []; this.panchayats = [];
      }
    });
    this.form.get('districtId')?.valueChanges.subscribe(val => {
      if (val) {
        this.loadBlocks(val);
        if (!this.isEdit && this.selectedLevel === 'block') {
          this.form.patchValue({ code: 'BLK' + this.generateRandomNum(7) });
        }
      } else {
        this.blocks = [];
      }
      if (!this.isEdit) {
        this.form.patchValue({ blockId: '', panchayatId: '' }, { emitEvent: false });
        this.panchayats = [];
      }
    });
    this.form.get('blockId')?.valueChanges.subscribe(val => {
      if (val) {
        this.loadPanchayats(val);
        if (!this.isEdit && this.selectedLevel === 'panchayat') {
          this.form.patchValue({ code: 'PNCHT' + this.generateRandomNum(8) });
        }
      } else {
        this.panchayats = [];
      }
      if (!this.isEdit) {
        this.form.patchValue({ panchayatId: '' }, { emitEvent: false });
      }
    });
  }

  // Bulk Import Variables
  selectedFile: File | null = null;
  isImporting: boolean = false;
  importSuccessMessage: string = '';

  downloadTemplate() {
    const csvContent = "Country Code,Country Name,State Code,State Name,District Name,Block Name,Panchayat Name,Village Name,Village Pincode\nIND,India,BR,Bihar,Patna,Patna Sadar,Some Panchayat,Some Village,800001";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Location_Master_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      this.selectedFile = file;
    } else {
      this.toast.error('Please select a valid CSV file');
      this.selectedFile = null;
      event.target.value = ''; // clear
    }
  }

  uploadLocations() {
    if (!this.selectedFile) return;
    this.isImporting = true;
    this.importSuccessMessage = '';

    this.apiService.uploadLocations(this.selectedFile).subscribe({
      next: (res: any) => {
        this.isImporting = false;
        this.importSuccessMessage = `Successfully processed ${res.rowsProcessed} rows!`;
        this.toast.success('Import completed');
        this.loadViewData();
        this.loadAuditData();
        this.selectedFile = null;
      },
      error: (err: any) => {
        this.isImporting = false;
        this.toast.error(err.error?.message || 'Error during import');
      }
    });
  }

  onSectionChange(section: string) {
    if (section !== this.activeSection) {
      // route logic would go here if needed, but per request it's handled via global links later.
    }
  }

  isAutoGenerated(level: string): boolean {
    return ['district', 'block', 'panchayat'].includes(level);
  }

    generateRandomNum(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }

  onLevelChange(level: string) {
    // Reset validators based on level
    const cId = this.form.get('countryId');
    const sId = this.form.get('stateId');
    const dId = this.form.get('districtId');
    const bId = this.form.get('blockId');
    const pId = this.form.get('panchayatId');
    const code = this.form.get('code');

    cId?.clearValidators(); sId?.clearValidators(); dId?.clearValidators(); bId?.clearValidators(); pId?.clearValidators(); code?.clearValidators();

    if (level === 'state' || level === 'district' || level === 'block' || level === 'panchayat' || level === 'village') {
      cId?.setValidators(Validators.required);
    }
    if (level === 'district' || level === 'block' || level === 'panchayat' || level === 'village') {
      sId?.setValidators(Validators.required);
    }
    if (level === 'block' || level === 'panchayat' || level === 'village') {
      dId?.setValidators(Validators.required);
    }
    if (level === 'panchayat' || level === 'village') {
      bId?.setValidators(Validators.required);
    }
    if (level === 'village') {
      pId?.setValidators(Validators.required);
    }
    
    if (this.isAutoGenerated(level)) {
      code?.clearValidators();
      code?.disable();
    } else {
      code?.setValidators(Validators.required);
      code?.enable();
    }

    cId?.updateValueAndValidity(); sId?.updateValueAndValidity(); dId?.updateValueAndValidity(); bId?.updateValueAndValidity(); pId?.updateValueAndValidity(); code?.updateValueAndValidity();
  }

  loadCountries() {
    this.locationService.getLocations('country', undefined, 'ACTIVE').subscribe(data => this.countries = data);
  }
  loadStates(countryId: number) {
    this.locationService.getLocations('state', countryId, 'ACTIVE').subscribe(data => this.states = data);
  }
  loadDistricts(stateId: number) {
    this.locationService.getLocations('district', stateId, 'ACTIVE').subscribe(data => this.districts = data);
  }
  loadBlocks(districtId: number) {
    this.locationService.getLocations('block', districtId, 'ACTIVE').subscribe(data => this.blocks = data);
  }
  loadPanchayats(blockId: number) {
    this.locationService.getLocations('panchayat', blockId, 'ACTIVE').subscribe(data => this.panchayats = data);
  }

  loadViewData() {
    let parentId: number | undefined = undefined;
    if (this.filterLevel === 'state' && this.filterCountryId) parentId = +this.filterCountryId;
    if (this.filterLevel === 'district' && this.filterStateId) parentId = +this.filterStateId;
    if (this.filterLevel === 'block' && this.filterDistrictId) parentId = +this.filterDistrictId;
    if (this.filterLevel === 'panchayat' && this.filterBlockId) parentId = +this.filterBlockId;
    if (this.filterLevel === 'village' && this.filterPanchayatId) parentId = +this.filterPanchayatId;

    this.locationService.getLocations(this.filterLevel, parentId).subscribe({
      next: (data) => this.locations = data,
      error: () => this.toast.error('Failed to load locations')
    });
  }

  onViewFilterChange() {
    this.loadViewData();
  }

  openForm(loc?: LocationDto) {
    this.isEdit = !!loc;
    this.form.reset({ status: 'ACTIVE', level: this.filterLevel });
    if (loc) {
      this.editingId = loc.id!;
      this.selectedLevel = this.filterLevel;
      
      // Patch values. Drops downs will trigger load due to valueChanges.
      this.form.patchValue({
        level: this.filterLevel,
        countryId: loc.countryId,
        stateId: loc.stateId,
        districtId: loc.districtId,
        blockId: loc.blockId,
        panchayatId: loc.panchayatId,
        code: loc.code,
        name: loc.name,
        pinCode: loc.pinCode,
        status: loc.status
      });
    } else {
      this.editingId = null;
    }
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0; // Go to Add/Edit tab
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.editingId = null;
    this.form.reset({ status: 'ACTIVE', level: this.selectedLevel });
  }

  saveLocation() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.getRawValue();
    const dto: LocationDto = {
      code: val.code,
      name: val.name,
      pinCode: val.pinCode,
      status: val.status
    };
    
    // Determine parent ID based on level
    if (this.selectedLevel === 'state') dto.parentId = val.countryId;
    if (this.selectedLevel === 'district') dto.parentId = val.stateId;
    if (this.selectedLevel === 'block') dto.parentId = val.districtId;
    if (this.selectedLevel === 'panchayat') dto.parentId = val.districtId; // wait, blockId is parent of panchayat
    if (this.selectedLevel === 'panchayat') dto.parentId = val.blockId;
    if (this.selectedLevel === 'village') dto.parentId = val.panchayatId;

    if (this.isEdit && this.editingId) {
      this.locationService.updateLocation(this.selectedLevel, this.editingId, dto).subscribe({
        next: () => {
          this.toast.success('Location updated successfully');
          this.cancelEdit();
          this.loadViewData();
          this.loadAuditData();
          if (this.tabGroup) this.tabGroup.selectedIndex = 1; // go to list
        },
        error: (err: any) => {
          if (err.error?.message === 'Name must be unique') {
            this.form.get('name')?.setErrors({ duplicate: true });
          } else if (err.error?.message === 'Code must be unique') {
            this.form.get('code')?.setErrors({ duplicate: true });
          } else {
            this.toast.error(err.error?.message || 'Failed to update location');
          }
        }
      });
    } else {
      this.locationService.saveLocation(this.selectedLevel, dto).subscribe({
        next: () => {
          this.toast.success('Location saved successfully');
          this.cancelEdit();
          this.loadViewData();
          this.loadAuditData();
        },
        error: (err: any) => {
          if (err.error?.message === 'Name must be unique') {
            this.form.get('name')?.setErrors({ duplicate: true });
          } else if (err.error?.message === 'Code must be unique') {
            this.form.get('code')?.setErrors({ duplicate: true });
          } else {
            this.toast.error(err.error?.message || 'Failed to save location');
          }
        }
      });
    }
  }

  confirmDeactivate(loc: LocationDto) {
    this.locationToDeactivate = loc;
    this.showConfirm = true;
  }

  handleDeactivateConfirm(confirmed: boolean) {
    if (confirmed && this.locationToDeactivate) {
      this.locationService.deleteLocation(this.filterLevel, this.locationToDeactivate.id!).subscribe({
        next: () => {
          this.toast.success('Location deactivated successfully');
          this.loadViewData();
          this.loadAuditData();
        },
        error: () => this.toast.error('Failed to deactivate location')
      });
    }
    this.showConfirm = false;
    this.locationToDeactivate = null;
  }

  // Audit Logic
  loadAuditData() {
    this.locationService.getAllAuditLogs(this.auditTabLevel).subscribe({
      next: (logs) => {
        this.auditLogs = logs.map(log => ({
          ...log,
          parsedChanges: this.computeChanges(log)
        }));
      },
      error: () => {
        this.toast.error('Failed to load audit logs');
      }
    });
  }

  computeChanges(log: LocationAuditLogDto): any[] {
    const changes: any[] = [];
    let oldObj: any = {};
    let newObj: any = {};
    
    if (log.oldValue) {
      try { oldObj = JSON.parse(log.oldValue); } catch (e) {}
    }
    if (log.newValue) {
      try { newObj = JSON.parse(log.newValue); } catch (e) {}
    }

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    
    for (const key of allKeys) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      
      // Ignore IDs and parent IDs typically if they didn't conceptually change, but we will just filter unchanged
      if (log.action === 'CREATE') {
         if (newVal !== null && newVal !== undefined && newVal !== '') {
             changes.push({ field: key, old: null, new: newVal });
         }
      } else if (log.action === 'UPDATE') {
         // Show only if values differ (primitive compare)
         if (oldVal !== newVal) {
             changes.push({ field: key, old: oldVal, new: newVal });
         }
      } else if (log.action === 'DEACTIVATE') {
         if (key === 'status') {
             changes.push({ field: key, old: oldVal, new: newVal });
         }
      }
    }
    return changes;
  }

  onAuditFilterChange() {
    this.loadAuditData();
  }
}





