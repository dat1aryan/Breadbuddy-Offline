import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'secondary';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5 pt-2">
        <p className="text-xs text-bb-text-secondary leading-relaxed font-sans select-none">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} className="text-xs font-semibold tracking-wide">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} className="text-xs font-black uppercase tracking-wider">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
