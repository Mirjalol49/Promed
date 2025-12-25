import React from 'react';
import { useToast } from '../contexts/ToastContext';

const ToastTestPanel: React.FC = () => {
    const { success, error, info } = useToast();

    const testActions = {
        success: {
            title: "Sinxronizatsiya a'lo!",
            message: "Barcha ma'lumotlar bazaga muvaffaqiyatli saqlandi."
        },
        error: {
            title: "Xatolik yuz berdi",
            message: "Ma'lumotlarni saqlashda muammo chiqdi. Qayta urinib ko'ring."
        },
        info: {
            title: "Yangi bildirishnoma",
            message: "Sizning sessiyangiz 5 daqiqadan so'ng tugaydi."
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
            <h3 className="font-bold text-sm text-gray-700 mb-3">🧪 Mega-Toast Test</h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => success(testActions.success.title, testActions.success.message)}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition text-sm font-medium"
                >
                    ✅ Test Success
                </button>
                <button
                    onClick={() => error(testActions.error.title, testActions.error.message)}
                    className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition text-sm font-medium"
                >
                    ❌ Test Error
                </button>
                <button
                    onClick={() => info(testActions.info.title, testActions.info.message)}
                    className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition text-sm font-medium"
                >
                    ℹ️ Test Info
                </button>
            </div>
        </div>
    );
};

export default ToastTestPanel;
