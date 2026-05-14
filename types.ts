export enum ConnectionType {
  BPL = 'BPL',
  APL = 'APL',
  UJJWALA = 'UJJWALA',
  Commercial = 'Commercial',
}

export type RelationType = 'S/O' | 'W/O';

export interface Customer {
  id: string;
  name: string;
  customerId: string;
  consumerNo: string;
  lpgId: string;
  relationType: RelationType;
  relationName: string;
  mobileNo: string;
  panchayat: string;
  otherPanchayat?: string;
  village: string;
  otherVillage?: string;
  svNo: string;
  aadhaarNo: string;
  connectionType: ConnectionType;
  balance: number;
  dueDate?: string;
  isDeleted?: boolean;
  agencyName?: string;
  kyc?: boolean;
  lastBookingDate?: string;
}

export type DocumentType = 'aadhaarCard' | 'bankPassbook' | 'consumerCard' | 'svDocument';

export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: DocumentType;
  url: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

export type TransactionType = 'Debit' | 'Credit';

export interface TransactionHistory {
  changedAt: string;
  previousState: {
    price: number;
    amountPaid: number;
    description: string;
    date: string;
    gasCompanyGiven: string;
    gasCompanyReceived?: string;
    source?: 'delivery' | 'manual';
  };
}

export interface Transaction {
  id: string;
  customerId?: string;
  date: string;
  price: number;
  amountPaid: number;
  description: string;
  gasCompanyGiven: string;
  gasCompanyReceived?: string;
  history?: TransactionHistory[];
  source?: 'delivery' | 'manual' | 'quick-sell';
  walkInName?: string;
  walkInMobile?: string;
}

export interface Delivery {
    id: string;
    customerId: string;
    customerName: string;
    customerRelationType: RelationType;
    customerRelationName: string;
    customerMobileNo: string;
    customerAddress: string;
    requestedAt: string;
    completedAt?: string | null;
}

export type NewCustomer = Omit<Customer, 'id' | 'isDeleted'>;
export type NewTransaction = Omit<Transaction, 'id' | 'customerId' | 'date' | 'history'>;
export type UpdateTransactionPayload = Omit<Transaction, 'id' | 'customerId' | 'history'>;

export interface DashboardStats {
  totalCustomers: number;
  totalTransactions: number;
  totalOutstanding: number;
  recentTransactions: any[];
  pendingDeliveries: number;
  completedDeliveriesInPeriod: number;
  pendingBookings: number;
}