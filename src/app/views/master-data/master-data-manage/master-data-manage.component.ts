import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import {
  MasterDataItem,
  MasterDataService,
  MasterDataSet,
  SaveMasterDataItem,
  SaveMasterDataSet
} from '../../FormBuilder/services/master-data.service';

@Component({
  selector: 'app-master-data-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastModule],
  providers: [MessageService],
  templateUrl: './master-data-manage.component.html',
  styleUrl: './master-data-manage.component.scss'
})
export class MasterDataManageComponent implements OnInit {
  sets: MasterDataSet[] = [];
  items: MasterDataItem[] = [];
  selectedSet: MasterDataSet | null = null;
  setSearch = '';
  itemSearch = '';

  editingSetId: number | null = null;
  editingItemId: number | null = null;

  showSetDialog = false;
  showItemDialog = false;
  savingSet = false;
  savingItem = false;
  loadingSets = false;
  loadingItems = false;

  setForm: SaveMasterDataSet = this.createEmptySet();
  itemForm: SaveMasterDataItem = this.createEmptyItem();

  constructor(
    private masterDataService: MasterDataService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadSets();
  }

  get filteredSets(): MasterDataSet[] {
    const search = this.setSearch.trim().toLowerCase();
    if (!search) {
      return this.sets;
    }

    return this.sets.filter(set =>
      set.name.toLowerCase().includes(search) ||
      set.code.toLowerCase().includes(search) ||
      (set.description || '').toLowerCase().includes(search)
    );
  }

  get filteredItems(): MasterDataItem[] {
    const search = this.itemSearch.trim().toLowerCase();
    if (!search) {
      return this.items;
    }

    return this.items.filter(item =>
      item.value.toLowerCase().includes(search) ||
      item.text.toLowerCase().includes(search) ||
      (item.parentValue || '').toLowerCase().includes(search) ||
      (item.foreignText || '').toLowerCase().includes(search)
    );
  }

  loadSets(): void {
    this.loadingSets = true;
    this.masterDataService.getSets(true).subscribe({
      next: sets => {
        this.sets = sets;
        if (this.selectedSet) {
          this.selectedSet = sets.find(set => set.id === this.selectedSet!.id) || null;
        }
        this.loadingSets = false;
      },
      error: () => {
        this.loadingSets = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load master data sets.' });
      }
    });
  }

  selectSet(set: MasterDataSet): void {
    this.selectedSet = set;
    this.itemSearch = '';
    this.loadItems(set.id);
  }

  openCreateSetDialog(): void {
    this.editingSetId = null;
    this.setForm = this.createEmptySet();
    this.showSetDialog = true;
  }

  openEditSetDialog(set: MasterDataSet = this.selectedSet!): void {
    if (!set) {
      return;
    }

    this.editingSetId = set.id;
    this.setForm = {
      code: set.code,
      name: set.name,
      description: set.description || '',
      sourceType: 'Manual',
      configurationJson: null,
      valueField: set.valueField || 'value',
      textField: set.textField || 'text',
      isCacheEnabled: false,
      cacheDurationMinutes: null,
      isActive: set.isActive
    };
    this.showSetDialog = true;
  }

  closeSetDialog(): void {
    if (this.savingSet) {
      return;
    }

    this.showSetDialog = false;
    this.editingSetId = null;
    this.setForm = this.createEmptySet();
  }

  saveSet(): void {
    if (!this.setForm.name.trim() || !this.setForm.code.trim()) {
      return;
    }

    this.savingSet = true;
    const payload = this.normalizeSetPayload();
    const request: Observable<number | void> = this.editingSetId
      ? this.masterDataService.updateSet(this.editingSetId, payload)
      : this.masterDataService.createSet(payload);

    request.subscribe({
      next: result => {
        const createdId = Number(result || 0);
        this.savingSet = false;
        this.showSetDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Master Data',
          detail: this.editingSetId ? 'Set updated successfully.' : 'Set created successfully.'
        });
        this.refreshSetsAfterSave(createdId);
      },
      error: (error: any) => {
        this.savingSet = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Master Data',
          detail: error?.error?.message || 'Failed to save set.'
        });
      }
    });
  }

  deleteSelectedSet(): void {
    if (!this.selectedSet || !confirm(`Delete master data set "${this.selectedSet.name}"?`)) {
      return;
    }

    this.masterDataService.deleteSet(this.selectedSet.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Master Data', detail: 'Set deleted.' });
        this.selectedSet = null;
        this.items = [];
        this.loadSets();
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Master Data',
          detail: error?.error?.message || 'Failed to delete set.'
        });
      }
    });
  }

  loadItems(setId: number): void {
    this.loadingItems = true;
    this.masterDataService.getItems(setId, true).subscribe({
      next: items => {
        this.items = items;
        this.loadingItems = false;
      },
      error: () => {
        this.loadingItems = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load master data items.' });
      }
    });
  }

  openCreateItemDialog(): void {
    if (!this.selectedSet) {
      return;
    }

    this.editingItemId = null;
    this.itemForm = this.createEmptyItem();
    this.showItemDialog = true;
  }

  openEditItemDialog(item: MasterDataItem): void {
    this.editingItemId = item.id;
    this.itemForm = {
      value: item.value,
      text: item.text,
      foreignText: item.foreignText || '',
      parentValue: item.parentValue || '',
      sortOrder: item.sortOrder || 0,
      extraJson: item.extraJson || null,
      isActive: item.isActive
    };
    this.showItemDialog = true;
  }

  closeItemDialog(): void {
    if (this.savingItem) {
      return;
    }

    this.showItemDialog = false;
    this.editingItemId = null;
    this.itemForm = this.createEmptyItem();
  }

  saveItem(): void {
    if (!this.selectedSet || !this.itemForm.value.trim() || !this.itemForm.text.trim()) {
      return;
    }

    this.savingItem = true;
    const payload = this.normalizeItemPayload();
    const request: Observable<number | void> = this.editingItemId
      ? this.masterDataService.updateItem(this.editingItemId, payload)
      : this.masterDataService.createItem(this.selectedSet.id, payload);

    request.subscribe({
      next: () => {
        this.savingItem = false;
        this.showItemDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Master Data',
          detail: this.editingItemId ? 'Item updated successfully.' : 'Item added successfully.'
        });
        this.editingItemId = null;
        this.itemForm = this.createEmptyItem();
        this.loadItems(this.selectedSet!.id);
        this.loadSets();
      },
      error: (error: any) => {
        this.savingItem = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Master Data',
          detail: error?.error?.message || 'Failed to save item.'
        });
      }
    });
  }

  deleteItem(item: MasterDataItem): void {
    if (!this.selectedSet || !confirm(`Delete item "${item.value}"?`)) {
      return;
    }

    this.masterDataService.deleteItem(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Master Data', detail: 'Item deleted.' });
        this.loadItems(this.selectedSet!.id);
        this.loadSets();
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Master Data',
          detail: error?.error?.message || 'Failed to delete item.'
        });
      }
    });
  }

  private refreshSetsAfterSave(createdId: number): void {
    this.masterDataService.getSets(true).subscribe(sets => {
      this.sets = sets;
      const idToSelect = createdId || this.editingSetId || this.selectedSet?.id;
      this.selectedSet = idToSelect ? sets.find(set => set.id === idToSelect) || null : this.selectedSet;
      if (this.selectedSet) {
        this.loadItems(this.selectedSet.id);
      }
      this.editingSetId = null;
      this.setForm = this.createEmptySet();
    });
  }

  private normalizeSetPayload(): SaveMasterDataSet {
    return {
      ...this.setForm,
      code: this.setForm.code.trim(),
      name: this.setForm.name.trim(),
      sourceType: 'Manual',
      description: this.toNullableString(this.setForm.description),
      configurationJson: null,
      valueField: this.toNullableString(this.setForm.valueField) || 'value',
      textField: this.toNullableString(this.setForm.textField) || 'text',
      isCacheEnabled: false,
      cacheDurationMinutes: null
    };
  }

  private normalizeItemPayload(): SaveMasterDataItem {
    return {
      ...this.itemForm,
      value: this.itemForm.value.trim(),
      text: this.itemForm.text.trim(),
      foreignText: this.toNullableString(this.itemForm.foreignText),
      parentValue: this.toNullableString(this.itemForm.parentValue),
      extraJson: this.toNullableString(this.itemForm.extraJson),
      sortOrder: Number(this.itemForm.sortOrder || 0)
    };
  }

  private createEmptySet(): SaveMasterDataSet {
    return {
      code: '',
      name: '',
      description: '',
      sourceType: 'Manual',
      configurationJson: null,
      valueField: 'value',
      textField: 'text',
      isCacheEnabled: false,
      cacheDurationMinutes: null,
      isActive: true
    };
  }

  private createEmptyItem(): SaveMasterDataItem {
    return {
      value: '',
      text: '',
      foreignText: '',
      parentValue: '',
      sortOrder: 0,
      extraJson: '',
      isActive: true
    };
  }

  private toNullableString(value?: string | null): string | null {
    const normalized = (value || '').trim();
    return normalized ? normalized : null;
  }
}
