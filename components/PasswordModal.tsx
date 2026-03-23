import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useLanguage } from '../contexts/LanguageContext';

interface PasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (password: string) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
    setPassword('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('passwordModal.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('passwordModal.prompt')}
        </p>
        <Input
          label={t('passwordModal.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && (
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('buttons.cancel')}
            </Button>
          )}
          <Button type="submit">
            {t('passwordModal.login')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordModal;