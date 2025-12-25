
import { Patient, InjectionStatus } from './types';

// Helper to create dates relative to now
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    fullName: 'Ralph Edwards',
    age: 32,
    gender: 'Male',
    phone: '+1 (555) 012-3456',
    email: 'ralph.e@example.com',
    operationDate: daysAgo(45),
    grafts: 2400,
    technique: 'FUE Sapphire',
    profileImage: 'https://picsum.photos/id/1005/200/200',
    beforeImage: 'https://picsum.photos/id/1005/400/300',
    afterImages: [
      { id: 'img1', url: 'https://picsum.photos/id/1012/400/300', label: '1 Month', date: daysAgo(15) }
    ],
    status: 'Active',
    injections: [
      { id: 'i1-1', date: daysAgo(30), status: InjectionStatus.COMPLETED, notes: 'First PRP session successful.' },
      { id: 'i1-2', date: daysAgo(15), status: InjectionStatus.COMPLETED, notes: 'Healing well.' },
      { id: 'i1-3', date: daysFromNow(2), status: InjectionStatus.SCHEDULED, notes: 'Check graft density.' },
      { id: 'i1-4', date: daysFromNow(16), status: InjectionStatus.SCHEDULED },
    ]
  },
  {
    id: '2',
    fullName: 'Jenny Wilson',
    age: 28,
    gender: 'Female',
    phone: '+1 (555) 012-7890',
    email: 'jenny.w@example.com',
    operationDate: daysAgo(10),
    grafts: 1800,
    technique: 'DHI',
    profileImage: 'https://picsum.photos/id/1011/200/200',
    beforeImage: 'https://picsum.photos/id/1011/400/300',
    afterImages: [],
    status: 'Active',
    injections: [
      { id: 'i2-1', date: daysFromNow(4), status: InjectionStatus.SCHEDULED, notes: 'Initial follow-up' },
      { id: 'i2-2', date: daysFromNow(18), status: InjectionStatus.SCHEDULED },
    ]
  }
];
