import { UserStorage } from "./userStorage";
import { ProductStorage } from "./productStorage";
import { SupplierStorage } from "./supplierStorage";
import { ContractorStorage } from "./contractorStorage";
import { WarehouseStorage } from "./warehouseStorage";
import { type IStorage } from "../storage";
import { DocumentRecord, InsertDocument, CreateDocumentItem, Log, Order, InsertOrder } from "@shared/schema";
import { dbLogger } from "@shared/logger";

/**
 * Модульная архитектура storage с разделением по доменам
 * Заменяет монолитный storage.ts на композицию специализированных модулей
 */
export class ModularStorage implements Partial<IStorage> {
  private userStorage = new UserStorage();
  private productStorage = new ProductStorage();
  private supplierStorage = new SupplierStorage();
  private contractorStorage = new ContractorStorage();
  private warehouseStorage = new WarehouseStorage();

  // User operations
  async getUser(id: number) {
    return this.userStorage.getUser(id);
  }

  async getUserByUsername(username: string) {
    return this.userStorage.getUserByUsername(username);
  }

  async createUser(user: any) {
    return this.userStorage.createUser(user);
  }

  // Product operations
  async getProducts() {
    return this.productStorage.getProducts();
  }

  async getProduct(id: number) {
    return this.productStorage.getProduct(id);
  }

  async getProductBySku(sku: string) {
    return this.productStorage.getProductBySku(sku);
  }

  async createProduct(product: any) {
    return this.productStorage.createProduct(product);
  }

  async updateProduct(id: number, product: any) {
    return this.productStorage.updateProduct(id, product);
  }

  async deleteProduct(id: number) {
    return this.productStorage.deleteProduct(id);
  }

  // Supplier operations
  async getSuppliers() {
    return this.supplierStorage.getSuppliers();
  }

  async getSupplier(id: number) {
    return this.supplierStorage.getSupplier(id);
  }

  async createSupplier(supplier: any) {
    return this.supplierStorage.createSupplier(supplier);
  }

  async updateSupplier(id: number, supplier: any) {
    return this.supplierStorage.updateSupplier(id, supplier);
  }

  async deleteSupplier(id: number) {
    return this.supplierStorage.deleteSupplier(id);
  }

  // Contractor operations
  async getContractors() {
    return this.contractorStorage.getContractors();
  }

  async getContractor(id: number) {
    return this.contractorStorage.getContractor(id);
  }

  async createContractor(contractor: any) {
    return this.contractorStorage.createContractor(contractor);
  }

  async updateContractor(id: number, contractor: any) {
    return this.contractorStorage.updateContractor(id, contractor);
  }

  async deleteContractor(id: number) {
    return this.contractorStorage.deleteContractor(id);
  }

  // Warehouse operations
  async getWarehouses() {
    return this.warehouseStorage.getWarehouses();
  }

  async getWarehouse(id: number) {
    return this.warehouseStorage.getWarehouse(id);
  }

  async createWarehouse(warehouse: any) {
    return this.warehouseStorage.createWarehouse(warehouse);
  }

  async updateWarehouse(id: number, warehouse: any) {
    return this.warehouseStorage.updateWarehouse(id, warehouse);
  }

  async deleteWarehouse(id: number) {
    return this.warehouseStorage.deleteWarehouse(id);
  }

  // Заглушки для методов которые еще не перенесены
  async getInventory(warehouseId?: number): Promise<Array<{id: number; name: string; quantity: number}>> {
    dbLogger.warn("getInventory: method not yet migrated to modular architecture");
    throw new Error("Method getInventory not implemented in modular storage");
  }

  async getDocuments(): Promise<DocumentRecord[]> {
    dbLogger.warn("getDocuments: method not yet migrated to modular architecture");
    throw new Error("Method getDocuments not implemented in modular storage");
  }

  async getOrders(): Promise<Order[]> {
    dbLogger.warn("getOrders: method not yet migrated to modular architecture");
    throw new Error("Method getOrders not implemented in modular storage");
  }

  async getLogs(): Promise<Log[]> {
    dbLogger.warn("getLogs: method not yet migrated to modular architecture");
    throw new Error("Method getLogs not implemented in modular storage");
  }
}