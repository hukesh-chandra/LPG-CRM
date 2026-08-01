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
  lastBookingDate?: string | null;
  remark?: string;
  cardStatus?: CardStatus | '';
}

export type CardStatus = 'weHave' | 'customerHas' | 'notClear';

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

export type PaymentMethod = 'cash' | 'online';

export type CylinderType = '14KG_HP' | '14KG_IN' | '14KG_BH' | '5KG' | 'COMMERCIAL_19KG' | 'COMMERCIAL_14KG';

export const CYLINDER_TYPES: CylinderType[] = ['14KG_HP', '14KG_IN', '14KG_BH', '5KG', 'COMMERCIAL_19KG', 'COMMERCIAL_14KG'];

export const DOMESTIC_14KG_CYLINDERS: CylinderType[] = ['14KG_HP', '14KG_IN', '14KG_BH'];

export const CYLINDER_TYPE_LABELS: Record<CylinderType, string> = {
  '14KG_HP': '14.2kg HP Gas',
  '14KG_IN': '14.2kg Indane',
  '14KG_BH': '14.2kg Bharat',
  '5KG': '5kg Domestic',
  'COMMERCIAL_19KG': '19kg Commercial',
  'COMMERCIAL_14KG': '14kg Commercial',
};

export interface AppUser {
  uid: string;
  email?: string;
  name: string;
  mobileNo: string;
  role: 'admin' | 'delivery_boy';
  active: boolean;
  createdAt?: string;
}

export interface StockLocation {
  id: string;
  name: string;
  type: 'godown' | 'vehicle';
  stock: Partial<Record<CylinderType, { filled: number; empty: number }>>;
  updatedAt?: string;
}

export type StockTransactionType =
  | 'transfer'
  | 'delivery'
  | 'direct_sale'
  | 'adjustment'
  | 'agency_supply'
  | 'load_out'
  | 'load_in'
  | 'delivery_completion'
  | 'manual_adjustment';

export interface StockTransaction {
  id: string;
  type: StockTransactionType;
  agencyName?: string;
  cylinderType: CylinderType;
  fromLocationId?: string;
  toLocationId?: string;
  filledDelta: number;
  emptyDelta: number;
  locationDeltas?: Record<string, { filled: number; empty: number }>;
  deliveryId?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  note?: string;
}

export interface Transaction {
  id: string;
  customerId?: string;
  date: string;
  price: number;
  amountPaid: number;
  paymentMethod?: PaymentMethod;
  description: string;
  gasCompanyGiven: string;
  gasCompanyReceived?: string;
  history?: TransactionHistory[];
  source?: 'delivery' | 'manual' | 'quick-sell';
  walkInName?: string;
  walkInMobile?: string;
  walkInConsumerNo?: string;
}

export type DeliveryStatus = 'pending' | 'out_for_delivery' | 'completed' | 'cancelled' | 'cannot_deliver';

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
    status?: DeliveryStatus;
    assignedTo?: string | null;
    assignedVehicleId?: string | null;
    assignedAt?: string | null;
    cylinderType?: CylinderType | null;
    filledHandedOver?: number;
    emptiesReceived?: number;
    completedBy?: string | null;
    undeliveredReason?: string | null;
    undeliveredAt?: string | null;
    undeliveredBy?: string | null;
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