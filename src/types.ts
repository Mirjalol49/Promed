
export enum InjectionStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  MISSED = 'Missed',
  CANCELLED = 'Cancelled'
}

export interface Injection {
  id: string;
  date: string; // ISO Date string
  status: InjectionStatus;
  notes?: string;
  dose?: string;
}

export interface PatientImage {
  id: string;
  url: string; // base64 or url
  label: string; // e.g. "1 Month", "10 Days"
  date: string; // upload date
  type?: 'image' | 'video'; // Added to distinguish media type explicitly
}

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  operationDate: string; // ISO Date string
  profileImage?: string; // URL or base64
  beforeImage?: string; // URL or base64
  afterImages: PatientImage[]; // Updated structure
  injections: Injection[];
  status: 'Active' | 'Recovered' | 'Observation';
  grafts?: number;
  technique?: string;
  telegramChatId?: string;
  tier?: 'regular' | 'pro';
  lastActive?: string; // ISO Date string for online status
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: string; // ISO string for sorting/formatting
  botLanguage?: string;
  totalAmount?: number; // Total agreed price for surgery/treatment
  currency?: 'USD' | 'UZS';
}

export interface StatData {
  label: string;
  value: string | number;
  change?: string; // e.g. "+8.9%"
  icon: any; // Lucide icon component
  color: string; // Tailwind class for bg color
}

export interface Profile {
  id: string;
  fullName?: string;
  email?: string;
  profileImage?: string;
  role: 'admin' | 'doctor' | 'staff' | 'viewer' | 'seller' | 'nurse';
  status: 'active' | 'frozen' | 'banned';
  subscription_status: 'trial' | 'active' | 'frozen';
  subscription_end?: string;
  trial_used?: boolean;

  autoFreezeEnabled?: boolean;
  accountId?: string;
  lockEnabled?: boolean;
  lockPassword?: string;
  phoneNumber?: string;
}

export type PageView = 'DASHBOARD' | 'PATIENTS' | 'PATIENT_DETAIL' | 'SETTINGS' | 'ADD_PATIENT' | 'EDIT_PATIENT' | 'ADMIN_DASHBOARD' | 'SUPER_ADMIN' | 'LEADS' | 'NOTES' | 'MESSAGES' | 'STAFF' | 'FINANCE' | 'ROLES';

export type LeadSource = 'Instagram' | 'Telegram' | 'Walk-in' | 'Referral';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'PHOTOS_SENT' | 'PRICE_GIVEN' | 'BOOKED' | 'LOST';

export interface Reminder {
  date: string; // ISO date string
  note: string;
  created_at?: string;
}

export interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  source: LeadSource;
  status: LeadStatus;
  graft_estimate?: number;
  price_quote?: number; // Store as number for calculation
  currency: string; // 'USD' default
  created_at: any; // Firestore Timestamp
  updated_at: any;
  last_contact_date?: any;
  loss_reason?: string;
  reminder?: Reminder;
  timeline?: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'note' | 'status_change' | 'reminder' | 'creation';
  content: string; // The note text or "Status changed to X"
  created_at: any; // Firestore Timestamp
  created_by?: string; // User ID
  metadata?: any; // Extra data (e.g. oldStatus, newStatus, reminderDate)
  status?: 'sent' | 'delivered' | 'read';
}

export interface LeadColumn {
  id: LeadStatus;
  title: string;
}

export interface Note {
  id: string;
  title: string; // Optional title
  content: string;
  color?: string; // For sticky note color effect
  createdAt: any; // Firestore Timestamp
  userId: string;
}

// --- STAFF MODULE TYPES ---
export type StaffRole = 'doctor' | 'assistant' | 'admin' | 'receptionist' | 'nurse' | 'cleaner' | 'other';

export interface Staff {
  id: string;
  fullName: string;
  role: StaffRole;
  phone: string;
  email?: string;
  salary: number; // Monthly salary or fixed rate
  currency: 'USD' | 'UZS';
  status: 'active' | 'on_leave' | 'terminated';
  imageUrl?: string;
  joinDate: string; // ISO Date
  notes?: string;
  accountId: string;
}

// --- FINANCE MODULE TYPES ---
export type TransactionType = 'income' | 'expense';
export type TransactionCategory =
  | 'surgery'       // Income
  | 'consultation'  // Income
  | 'injection'     // Income
  | 'salary'        // Expense
  | 'rent'          // Expense
  | 'equipment'     // Expense
  | 'marketing'     // Expense
  | 'food'          // Expense
  | 'utility'       // Expense
  | 'tax'           // Expense
  | 'other';        // Both


export interface Transaction {
  id: string;
  amount: number;
  currency: 'USD' | 'UZS';
  type: TransactionType;
  category: TransactionCategory;
  date: string; // ISO Date
  time?: string; // HH:mm format (e.g., "14:30")
  description?: string;

  // Relations
  patientId?: string; // If income from patient
  staffId?: string;   // If salary payment

  // Return/Refund tracking
  returned?: boolean;
  returnedAt?: string; // ISO Date when returned
  returnNote?: string;
  isVoided?: boolean;
  voidedAt?: string | null; // ISO Date when voided

  accountId: string;
  createdAt: any;
}

export interface FinanceStats {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  salaryExpense: number;
}
