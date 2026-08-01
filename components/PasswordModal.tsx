import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useLanguage } from '../contexts/LanguageContext';

interface PasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (email: string, password: string) => Promise<void> | void;
  errorMessage?: string | null;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit, errorMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err: any) {
      setLocalError(err?.message || 'Login failed. Please verify credentials and Admin role.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = errorMessage || localError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('passwordModal.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your Admin account email & password to sign in. (Accounts are configured in database/auth).
        </p>

        {displayError && (
          <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
            {displayError}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />

        <Input
          label={t('passwordModal.password')}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2 pt-4">
          {onClose && (
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {t('buttons.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : t('passwordModal.login')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordModal;