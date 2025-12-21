import React from 'react';
import { useToast } from '../contexts/ToastContext';

/**
 * Toast Test Component
 * 
 * This component provides buttons to test all toast notification types.
 * Add this to your app temporarily to verify the toast system works correctly.
 * 
 * Usage:
 * 1. Import this component in App.tsx
 * 2. Add <ToastTestPanel /> inside your Layout component
 * 3. Click the buttons to test each notification type
 * 4. Remove this component before deploying to production
 */

const ToastTestPanel: React.FC = () => {
    const { success, error, info } = useToast();

    const testMessages = {
        success: [
            'Profile saved successfully!',
            'Patient added to the system.',
            'Your changes have been saved.',
            'Operation completed successfully!'
        ],
        error: [
            'Failed to save changes. Please try again.',
            'Network error. Please check your connection.',
            'Invalid credentials provided.',
            'Permission denied. Contact administrator.'
        ],
        info: [
            'Your session will expire in 5 minutes.',
            'New updates are available.',
            'Scheduled maintenance tonight at 2 AM.',
            'Remember to backup your data regularly.'
        ]
    };

    const getRandomMessage = (type: 'success' | 'error' | 'info') => {
        const messages = testMessages[type];
        return messages[Math.floor(Math.random() * messages.length)];
    };

    // Test multiple toasts at once
    const testMultiple = () => {
        setTimeout(() => success(getRandomMessage('success')), 0);
        setTimeout(() => info(getRandomMessage('info')), 500);
        setTimeout(() => error(getRandomMessage('error')), 1000);
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
            <h3 className="font-bold text-sm text-gray-700 mb-3">🧪 Toast Test Panel</h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => success(getRandomMessage('success'))}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm font-medium"
                >
                    ✅ Test Success
                </button>
                <button
                    onClick={() => error(getRandomMessage('error'))}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                >
                    ❌ Test Error
                </button>
                <button
                    onClick={() => info(getRandomMessage('info'))}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm font-medium"
                >
                    ℹ️ Test Info
                </button>
                <hr className="my-1" />
                <button
                    onClick={testMultiple}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition text-sm font-medium"
                >
                    🚀 Test Multiple
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    Hover over toasts to pause timer
                </p>
            </div>
        </div>
    );
};

export default ToastTestPanel;
