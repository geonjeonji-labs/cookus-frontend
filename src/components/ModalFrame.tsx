import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import './LoginModal.css';

export default function ModalFrame({
  title,
  desc,
  onClose,
  children,
  modalClassName = 'login',
}: {
  title: string;
  desc?: string;
  onClose: () => void;
  children: ReactNode;
  modalClassName?: string;
}) {
  const host = document.querySelector('.app-frame') ?? document.body;
  const modalClass = ['modal', modalClassName].filter(Boolean).join(' ');
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>×</button>
        <h3 className="modal-title">{title}</h3>
        {desc && <p className="modal-desc">{desc}</p>}
        {children}
      </div>
    </div>,
    host
  );
}
