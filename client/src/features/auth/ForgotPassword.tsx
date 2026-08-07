import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

type ForgotState = 'REQUEST' | 'SENT' | 'RESET' | 'SUCCESS';

export default function ForgotPassword() {
  const [step, setStep] = useState<ForgotState>('REQUEST');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('SENT');
      toast.success('Reset link sent to your inbox! 📬');
    }, 1000);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match! 💀');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 chars bestie.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('SUCCESS');
      toast.success('Password updated! Ready to roll. 🚀');
    }, 1000);
  };

  return (
    <Card accent="violet" className="p-8">
      {step === 'REQUEST' && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-bb-text-primary mb-1">Forgot Password? 🧐</h2>
            <p className="text-xs text-bb-text-muted">No worries bestie, we'll get you back in.</p>
          </div>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <Input
              type="email"
              label="Your Registered Email"
              placeholder="your.email@campus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              send reset link
            </Button>
          </form>
        </>
      )}

      {step === 'SENT' && (
        <div className="text-center py-4 space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-black text-bb-text-primary">Reset Link Sent!</h2>
          <p className="text-xs text-bb-text-muted max-w-sm mx-auto leading-relaxed">
            We sent a secure password reset link to <span className="text-bb-text-primary font-semibold font-mono">{email}</span>. Check your spam if it's missing!
          </p>
          <Button onClick={() => setStep('RESET')} className="w-full">
            simulate clicking reset link ⚡
          </Button>
        </div>
      )}

      {step === 'RESET' && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-bb-text-primary mb-1">Reset Password 🔑</h2>
            <p className="text-xs text-bb-text-muted">Pick something strong this time!</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              type="password"
              label="New Password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<KeyRound size={16} />}
              required
            />
            <Input
              type="password"
              label="Confirm New Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<KeyRound size={16} />}
              required
            />
            {error && (
              <div className="p-3 rounded-bb-xs bg-bb-coral border-2 border-black text-xs text-bb-coral-fg font-medium">
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full mt-2">
              reset password
            </Button>
          </form>
        </>
      )}

      {step === 'SUCCESS' && (
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center text-bb-lime">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-xl font-black text-bb-text-primary">Vibe Restored!</h2>
          <p className="text-xs text-bb-text-muted leading-relaxed">
            Your password has been successfully reset. Time to get back to saving!
          </p>
          <Link to="/login" className="block w-full">
            <Button className="w-full">go to sign in</Button>
          </Link>
        </div>
      )}

      {step !== 'SUCCESS' && (
        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-bb-text-muted hover:text-bb-text-primary transition-colors">
            <ArrowLeft size={12} /> Back to Sign In
          </Link>
        </div>
      )}
    </Card>
  );
}
