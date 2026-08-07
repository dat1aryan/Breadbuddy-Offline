import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { setAuth } from '../../lib/auth';
import { User } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { buttonPressVariants } from '../../animations/transitions';

interface LoginProps {
  onAuth: (user: User) => void;
}

export default function Login({ onAuth }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields bestie 🫠');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login({ email, password });
      setAuth(data.token, data.user);

      toast.success(`Welcome back, ${data.user.name}! ✨`);
      onAuth(data.user);

      // Check if onboarding completed for this user
      const hasOnboarded = localStorage.getItem(`onboarded_${data.user.id}`);
      if (hasOnboarded) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Login failed, try again bestie 💀';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.success('Mock Google login successful! 💖');
    // Simulate standard mock user
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

    const hasOnboarded = localStorage.getItem(`onboarded_${mockUser.id}`);
    if (hasOnboarded) {
      navigate('/dashboard');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <Card accent="lime" className="p-8" glassy>
      <div className="text-center mb-6 space-y-2.5">
        <h2 className="text-3xl font-black tracking-tight leading-tight uppercase select-none">
          <span className="text-bb-violet mr-2.5">Welcome</span><span className="text-bb-lime">Back</span>
        </h2>
        <p className="text-[10px] text-bb-text-muted font-mono uppercase tracking-wider">
          Let's get your finances under control
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-bb-text-muted font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-bb-xs border-2 border-bb-border bg-bb-surface accent-bb-violet focus:outline-none focus:ring-2 focus:ring-bb-violet"
            />
            Remember Me
          </label>
          <Link to="/forgot-password">
            <span className="text-xs font-semibold text-bb-violet hover:text-bb-lime transition-colors">
              Forgot password?
            </span>
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-bb-xs bg-bb-coral border-2 border-black text-xs text-bb-coral-fg font-medium">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full mt-2">
          sign in
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
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-bb-sm border-2 border-bb-border bg-bb-surface hover:border-bb-violet text-xs font-bold text-bb-text-primary transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </motion.button>

      <div className="mt-6 text-center">
        <Link to="/signup">
          <span className="text-xs font-semibold text-bb-text-muted hover:text-bb-text-primary transition-colors">
            Don't have an account? <span className="text-bb-lime">Sign up</span>
          </span>
        </Link>
      </div>
    </Card>
  );
}
