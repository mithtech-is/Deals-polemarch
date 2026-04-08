'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !isMounted) return;

    const body = document.body;
    const openCount = Number(body.dataset.modalOpenCount ?? '0') + 1;
    body.dataset.modalOpenCount = String(openCount);
    body.classList.add('modal-open');

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const nextCount = Math.max(0, Number(body.dataset.modalOpenCount ?? '1') - 1);
      body.dataset.modalOpenCount = String(nextCount);
      if (nextCount === 0) {
        body.classList.remove('modal-open');
      }
    };
  }, [isOpen, isMounted, onClose]);

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
