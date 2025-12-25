import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';
import SyncToast from './SyncToast';

const ToastContainer: React.FC = () => {
    const { activeToast, hideToast } = useToast();

    return (
        <SyncToast
            isVisible={!!activeToast}
            title={activeToast?.title || ''}
            message={activeToast?.message || ''}
            type={activeToast?.type}
            onClose={hideToast}
        />
    );
};

export default ToastContainer;
