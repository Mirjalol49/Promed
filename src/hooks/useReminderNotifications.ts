import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { leadService } from '../services/leadService';
import { useAppSounds } from './useAppSounds';
import { Lead } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const useReminderNotifications = () => {
    const { userId } = useAccount();
    const { playNotification } = useAppSounds();
    const { t } = useLanguage();

    // Convert Set to ref directly to persist across renders without causing re-renders
    const processedReminders = useRef<Set<string>>(new Set());
    const [leads, setLeads] = useState<Lead[]>([]);

    // Subscribe to leads
    useEffect(() => {
        if (!userId) return;

        const unsubscribe = leadService.subscribeToLeads(
            userId,
            (updatedLeads) => {
                setLeads(updatedLeads);
            },
            (error) => console.error("Error adhering to leads for reminders:", error)
        );

        return () => unsubscribe();
    }, [userId]);

    // Check for due reminders
    useEffect(() => {
        if (leads.length === 0) return;

        const checkReminders = () => {
            const now = new Date();
            let soundPlayed = false;

            leads.forEach(lead => {
                if (lead.reminder?.date) {
                    const reminderDate = new Date(lead.reminder.date);
                    const leadId = lead.id;

                    // Check if reminder is in the past
                    if (reminderDate <= now) {
                        // If we haven't processed this reminder yet
                        if (!processedReminders.current.has(leadId)) {
                            // Calculate how long ago it became due
                            const diffInMs = now.getTime() - reminderDate.getTime();

                            // Only notify if it became due within the last minute
                            // This prevents spamming sounds for old reminders on page load
                            if (diffInMs < 60000) { // 60 seconds
                                if (!soundPlayed) {
                                    console.log(`🔔 Playing sound for reminder: ${lead.full_name}`);
                                    playNotification();
                                    soundPlayed = true; // Play only once per batch

                                    // Optional: Browser notification
                                    if (Notification.permission === 'granted') {
                                        new Notification(t('upcoming_reminder') || 'Reminder', {
                                            body: `${lead.full_name}: ${lead.reminder.note}`,
                                        });
                                    }
                                }
                            }

                            // Mark as processed regardless of whether we played sound or not
                            // (so we don't process old reminders again)
                            processedReminders.current.add(leadId);
                        }
                    } else {
                        // If reminder is in future, ensure it's NOT in processed set
                        // This allows re-notifying if the date is updated to a new future date and then becomes due again
                        if (processedReminders.current.has(leadId)) {
                            processedReminders.current.delete(leadId);
                        }
                    }
                }
            });
        };

        // Run check immediately
        checkReminders();

        // And then every 15 seconds
        const intervalId = setInterval(checkReminders, 15000);

        return () => clearInterval(intervalId);
    }, [leads, playNotification, t]);
};
