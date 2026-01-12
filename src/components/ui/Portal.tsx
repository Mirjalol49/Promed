import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';

interface PortalProps {
  children: React.ReactNode;
  lockScroll?: boolean;
}

export const Portal: React.FC<PortalProps> = ({ children, lockScroll = true }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock scroll when portal is mounted (modal is open)
  useScrollLock(mounted && lockScroll);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default Portal;

