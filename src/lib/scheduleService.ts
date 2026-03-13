import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

export interface ScheduleEvent {
  id: string;
  accountId: string;
  patientId: string;
  injectionId?: string;
  date: string;
  type: 'Operation' | 'Injection';
  title: string;
  subtitle: string;
  name: string;
  patientImage: string | null;
  tier: 'regular' | 'pro' | 'vip';
  status: string | null;
}

export const subscribeToUpcomingSchedules = (
  accountId: string,
  onUpdate: (events: ScheduleEvent[]) => void,
  onError?: (error: any) => void
) => {
  if (!accountId) {
    console.warn("⚠️ subscribeToUpcomingSchedules: No accountId provided.");
    return () => { };
  }

  // Get start of today (local time) to avoid fetching past history
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const q = query(
    collection(db, "schedules"),
    where("accountId", "==", accountId),
    where("date", ">=", todayStr),
    orderBy("date", "asc"),
    limit(100)
  );

  let isUnsubscribed = false;

  const unsubscribeFn = onSnapshot(q, (snapshot) => {
    if (isUnsubscribed) return;
    const events = snapshot.docs.map(doc => ({
      ...(doc.data() as ScheduleEvent),
      id: doc.id
    }));
    onUpdate(events);
  }, (error) => {
    if (isUnsubscribed) return;
    console.error("Schedules subscription error:", error);
    if (onError) onError(error);
  });

  return () => {
    isUnsubscribed = true;
    unsubscribeFn();
  };
};
