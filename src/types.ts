
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
  botLanguage?: string;
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
  role: 'admin' | 'doctor' | 'staff';
  status: 'active' | 'frozen' | 'banned';
  subscription_status: 'trial' | 'active' | 'frozen';
  subscription_end?: string;
  trial_used?: boolean;

  autoFreezeEnabled?: boolean;
  accountId?: string;
  lockEnabled?: boolean;
  lockPassword?: string;
}

export type PageView = 'DASHBOARD' | 'PATIENTS' | 'PATIENT_DETAIL' | 'SETTINGS' | 'ADD_PATIENT' | 'EDIT_PATIENT' | 'ADMIN_DASHBOARD' | 'SUPER_ADMIN' | 'LEADS' | 'NOTES' | 'MESSAGES';

export type LeadSource = 'Instagram' | 'Telegram' | 'Walk-in' | 'Referral';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'PHOTOS_SENT' | 'PRICE_GIVEN' | 'BOOKED' | 'LOST';

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
