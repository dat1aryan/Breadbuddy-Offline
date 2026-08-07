import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';
import { User } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useToast } from '../../hooks/useToast';
import { buttonPressVariants } from '../../animations/transitions';

interface SignupProps {
  onAuth: (user: User) => void;
}

export default function Signup({ onAuth }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  // Password requirements state
  const [requirements, setRequirements] = useState({
    length: false,
    number: false,
    uppercase: false,
    special: false,
  });

  useEffect(() => {
    setRequirements({
      length: password.length >= 8,
      number: /\d/.test(password),
      uppercase: /[A-Z]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  // Calculate password strength score (0-4)
  const strengthScore = Object.values(requirements).filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'Empty', text: 'text-bb-text-muted', color: undefined as any };
    if (strengthScore <= 1) return { label: 'Weak bestie 🥱', text: 'text-bb-coral', color: 'coral' as const };
    if (strengthScore <= 3) return { label: 'Getting there ✨', text: 'text-bb-violet', color: 'violet' as const };
    return { label: 'Unbreakable! 💖', text: 'text-bb-lime', color: 'lime' as const };
  };

  const strength = getStrengthLabel();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strengthScore < 4) {
      setError('Password is too weak, bestie! Complete the checklist.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match! 💀');
      return;
    }
    if (!terms) {
      setError('You need to agree to terms to secure the bag 💼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create user (don't ask for allowance yet, onboarding handles it)
      const data = await api.signup({
        email,
        password,
        name,
        monthlyAllowance: 0,
      });

      setAuth(data.token, data.user);
      onAuth(data.user);

      toast.success('Account created! Now verify email ✨');
      // Save temp email to state/localStorage for verification screen to display
      localStorage.setItem('temp_verify_email', email);
      navigate('/verify');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Signup failed 🫠';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    toast.success('Google Signup successful! 💖');
    const mockUser: User = {
      id: 999,
      email: 'bestie@gmail.com',
      name: 'Google Bestie',
      monthlyAllowance: 0,
      currency: '₹',
      vibe: 'toast'
    };
    setAuth('mock-google-token', mockUser);
    onAuth(mockUser);
    navigate('/onboarding');
  };

  return (
    <Card accent="lime" className="p-8" glassy>
      <div className="text-center mb-6 space-y-2.5">
        <h2 className="text-3xl font-black tracking-tight leading-tight uppercase select-none">
          <span className="text-bb-lime mr-2.5">Create</span><span className="text-bb-violet">Account</span>
        </h2>
        <p className="text-[10px] text-bb-text-muted font-mono uppercase tracking-wider">
          Ready to save for something awesome?
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          type="text"
          label="Your Name"
          placeholder="what do your friends call you?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon size={16} />}
          required
        />

        <Input
          type="email"
          label="Email Address"
          placeholder="your.email@campus.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          required
        />

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-bb-text-primary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            required
          />
        </div>

        {/* Password Strength Meter */}
        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold font-mono">
              <span className="text-bb-text-muted">PASSWORD STRENGTH</span>
              <span className={strength.text}>{strength.label}</span>
            </div>
            {/* ProgressBar primitive replacing the custom 4-segment div */}
            <ProgressBar
              percentage={strengthScore * 25}
              color={strength.color}
              height={8}
            />

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono text-bb-text-muted">
              <div className="flex items-center gap-1">
                {requirements.length ? <Check size={10} className="text-bb-lime" /> : <X size={10} className="text-bb-coral" />}
                <span className={requirements.length ? 'text-bb-text-secondary' : ''}>Min 8 characters</span>
              </div>
              <div className="flex items-center gap-1">
                {requirements.uppercase ? <Check size={10} className="text-bb-lime" /> : <X size={10} className="text-bb-coral" />}
                <span className={requirements.uppercase ? 'text-bb-text-secondary' : ''}>1 Uppercase letter</span>
              </div>
              <div className="flex items-center gap-1">
                {requirements.number ? <Check size={10} className="text-bb-lime" /> : <X size={10} className="text-bb-coral" />}
                <span className={requirements.number ? 'text-bb-text-secondary' : ''}>1 Number</span>
              </div>
              <div className="flex items-center gap-1">
                {requirements.special ? <Check size={10} className="text-bb-lime" /> : <X size={10} className="text-bb-coral" />}
                <span className={requirements.special ? 'text-bb-text-secondary' : ''}>1 Special character</span>
              </div>
            </div>
          </div>
        )}

        <Input
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          required
        />

        <label className="flex items-start gap-2.5 text-xs text-bb-text-muted font-semibold cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="w-4 h-4 rounded-bb-xs border-2 border-bb-border bg-bb-surface accent-bb-violet focus:outline-none focus:ring-2 focus:ring-bb-violet mt-0.5"
            required
          />
          <span>I agree to keep it real and budget wisely 🤞</span>
        </label>

        {error && (
          <div className="p-3 rounded-bb-xs bg-bb-coral border-2 border-black text-xs text-bb-coral-fg font-medium">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full mt-2">
          create account
        </Button>
      </form>

      {/* Google Auth */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-bb-border" />
        </div>
        <span className="relative px-3 bg-bb-bg text-[10px] text-bb-text-muted font-mono">
          OR CONTINUE WITH
        </span>
      </div>

      <motion.button
        variants={buttonPressVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        onClick={handleGoogleSignup}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-bb-sm border-2 border-bb-border bg-bb-surface hover:border-bb-violet text-xs font-bold text-bb-text-primary transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </motion.button>

      <div className="mt-6 text-center">
        <Link to="/login">
          <span className="text-xs font-semibold text-bb-text-muted hover:text-bb-text-primary transition-colors">
            Already have an account? <span className="text-bb-violet hover:text-bb-lime">Sign in</span>
          </span>
        </Link>
      </div>
    </Card>
  );
}
