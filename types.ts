
export interface Device {
  id: string;
  name: string;
  type: string;
  macAddress: string;
  assignedDate: string;
}

export interface Transaction {
  id: string;
  customerId?: string; // Link to customer
  customerName?: string; // Snapshot of name at time of tx
  date: string;
  amount: number;
  type: 'PAYMENT' | 'RECHARGE' | 'REFUND';
  method: 'CASH' | 'UPI' | 'CARD';
  description: string;
  receiptImage?: string; // Base64 string of payment screenshot
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  balance: number;
  devices: Device[];
  history: Transaction[];
  avatarUrl: string;
  subscriptionType: 'CABLE' | 'INTERNET';
  planDays: number; // e.g., 30 for monthly
  expiryDate: string; // ISO Date string
  area?: string;
  address?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  serialNumbers: string[]; // Array of unique serials. Quantity is length of this.
  image?: string; // Base64 Image of the box/device
  remarks?: string;      
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  TECHNICIAN = 'TECHNICIAN',
  COLLECTION_AGENT = 'COLLECTION_AGENT'
}

export interface User {
  id: string;
  name: string;
  username: string; // Login ID
  password: string; // Login Password
  role: UserRole;
  permissions: ViewState[]; // Which pages they can see
}

export interface ComplaintHistory {
    timestamp: string;
    action: string;
    by: string;
    details?: string;
}

export interface Complaint {
  id: string;
  customerId?: string; // Optional
  customerName?: string; // Optional
  assignedToUserIds: string[]; // Changed to array for multiple employees
  description: string;
  status: 'PENDING' | 'RESOLVED';
  date: string;
  resolvedBy?: string;
  resolutionRemark?: string;
  history?: ComplaintHistory[];
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'PAYMENTS' | 'HISTORY' | 'INVENTORY' | 'ADMIN' | 'COMPLAINTS';