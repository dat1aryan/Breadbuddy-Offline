import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('temp_verify_email') || 'bestie@campus.com';
    setEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (timer > 0 && !verified) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer, verified]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      toast.error('Enter a valid 4-digit code bestie!');
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      toast.success('Email verified successfully! 💖');
    }, 1500);
  };

  const handleResend = () => {
    if (timer > 0) return;
    toast.success('New verification code sent! Check your inbox. 📬');
    setTimer(59);
  };

  return (
    <Card accent="violet" className="p-8">
      {!verified ? (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-bb-text-primary mb-1">Verify Email 📩</h2>
            <p className="text-xs text-bb-text-muted">We sent a 4-digit code to</p>
            <p className="text-xs text-bb-violet font-mono font-semibold mt-0.5">{email}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              type="text"
              label="Verification Code"
              placeholder="1234"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              leftIcon={<Mail size={16} />}
              className="text-center tracking-widest text-lg font-bold font-mono"
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              verify &amp; continue
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 items-center text-xs font-semibold">
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className={`transition-colors ${
                timer > 0
                  ? 'text-bb-text-muted cursor-not-allowed'
                  : 'text-bb-violet hover:text-bb-lime cursor-pointer'
              }`}
            >
              {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
            </button>
            <Link
              to="/signup"
              onClick={() => localStorage.removeItem('temp_verify_email')}
              className="text-bb-text-muted hover:text-bb-text-primary transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Change email address
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center text-bb-lime">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-xl font-black text-bb-text-primary">Email Verified!</h2>
          <p className="text-xs text-bb-text-muted leading-relaxed max-w-xs mx-auto">
            Vibe check passed! Let's get your profile set up so you can start saving.
          </p>
          <Button onClick={() => navigate('/onboarding')} className="w-full">
            let's go! 🚀
          </Button>
        </div>
      )}
    </Card>
  );
}
