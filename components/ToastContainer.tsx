import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { Portal } from './Portal';
import SyncToast from './ui/SyncToast';

const ToastContainer: React.FC = () => {
    const { activeToast, hideToast } = useToast();

    return (
        <Portal>
            <SyncToast
                isVisible={!!activeToast}
                title={activeToast?.title || ''}
                message={activeToast?.message || ''}
                type={activeToast?.type}
                onClose={hideToast}
            />
        </Portal>
    );
};

export default ToastContainer;
