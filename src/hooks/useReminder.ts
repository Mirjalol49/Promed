import { useState, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, Reminder } from '../types';
import { leadService } from '../services/leadService';

interface UseReminderReturn {
    setReminder: (leadId: string, date: Date, reason: string, existingEventId?: string) => Promise<boolean>;
    clearReminder: (leadId: string, completionNote?: string) => Promise<boolean>;
    isOverdue: (lead: Lead) => boolean;
    hasReminder: (lead: Lead) => boolean;
    isLoading: boolean;
    error: string | null;
}

export const useReminder = (): UseReminderReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Set a reminder for a lead
     * @returns true on success, false on failure
     */
    const setReminder = useCallback(async (leadId: string, date: Date, reason: string, existingEventId?: string): Promise<boolean> => {
        // Validate: Date cannot be in the past
        const now = new Date();
        if (date < now) {
            setError('Cannot set a reminder in the past');
            return false;
        }

        // Validate: Reason should not be empty
        if (!reason.trim()) {
            setError('Please provide a reason for the reminder');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const reminderData: Reminder = {
                date: date.toISOString(),
                note: reason.trim(),
                created_at: new Date().toISOString()
            };

            // Update lead with reminder
            await updateDoc(doc(db, 'leads', leadId), {
                reminder: reminderData,
                updated_at: serverTimestamp()
            });

            if (existingEventId) {
                // Update existing timeline event
                await leadService.updateTimelineEvent(leadId, existingEventId, {
                    content: `Reminder updated to ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${reason.trim()}`,
                    metadata: { reminderDate: date.toISOString(), reason: reason.trim() }
                });
            } else {
                // Add timeline event for the reminder
                await leadService.addTimelineEvent(leadId, {
                    type: 'reminder',
                    content: `Reminder set for ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${reason.trim()}`,
                    created_by: 'current-user',
                    metadata: { reminderDate: date.toISOString(), reason: reason.trim() }
                });
            }

            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('Failed to set reminder:', err);
            setError('Failed to save reminder. Please try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    /**
     * Clear/remove a reminder from a lead
     */
    const clearReminder = useCallback(async (leadId: string, completionNote?: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await updateDoc(doc(db, 'leads', leadId), {
                reminder: null,
                updated_at: serverTimestamp()
            });

            if (completionNote?.trim()) {
                await leadService.addTimelineEvent(leadId, {
                    type: 'note',
                    content: completionNote.trim(),
                    created_by: 'current-user',
                    metadata: { isCompletion: true }
                });
            }

            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('Failed to clear reminder:', err);
            setError('Failed to remove reminder. Please try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    /**
     * Check if a lead's reminder is overdue
     */
    const isOverdue = useCallback((lead: Lead): boolean => {
        if (!lead.reminder?.date) return false;

        try {
            const reminderDate = new Date(lead.reminder.date);
            return reminderDate < new Date();
        } catch {
            return false;
        }
    }, []);

    /**
     * Check if a lead has an active reminder
     */
    const hasReminder = useCallback((lead: Lead): boolean => {
        return !!lead.reminder?.date;
    }, []);

    return {
        setReminder,
        clearReminder,
        isOverdue,
        hasReminder,
        isLoading,
        error
    };
};
