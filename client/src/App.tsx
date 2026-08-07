import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { User } from './lib/types';
import { getUser, isAuthenticated } from './lib/auth';
import { LoadingScreen } from './components/feedback/LoadingScreen';
import { onboardingEngine } from './lib/onboardingEngine';

// Phase 2 features
import LandingPage from './features/landing/LandingPage';
import AuthLayout from './features/auth/AuthLayout';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';
import ForgotPassword from './features/auth/ForgotPassword';
import VerifyEmail from './features/auth/VerifyEmail';
import Onboarding from './features/onboarding/Onboarding';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  rotation: string;
}

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const handleDailyBreadShown = () => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      sessionStorage.setItem(`daily_bread_shown_${user.id}_${today}`, 'true');
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser());
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const handleExpenseAdded = () => {
      // Celebration burst of 15 particles rising from near the Add Expense area
      const celebrationEmojis = ['💸', '🍞', '✨', '🤑', '🪙', '🎉', '🚀', '💖'];
      const burstParticles = Array.from({ length: 15 }).map((_, i) => {
        const id = Date.now() + Math.random() + i;
        // Spawn around center-bottom of screen (relative to dashboard form)
        const x = window.innerWidth * 0.35 + (Math.random() - 0.5) * 250;
        const y = window.innerHeight * 0.65 + (Math.random() - 0.5) * 150;
        const emoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
        const rotation = `${(Math.random() - 0.5) * 90}deg`;

        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== id));
        }, 1200);

        return {
          id,
          x,
          y,
          emoji,
          rotation,
        };
      });

      setParticles((prev) => [...prev, ...burstParticles]);
    };

    window.addEventListener('expense-added', handleExpenseAdded);
    
    return () => {
      window.removeEventListener('expense-added', handleExpenseAdded);
    };
  }, []);

  if (!authChecked) {
    return <LoadingScreen message="Loading your bestie..." />;
  }


  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthLayout>
                <Login onAuth={(u) => setUser(u)} />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/signup"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthLayout>
                <Signup onAuth={(u) => setUser(u)} />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthLayout>
              <ForgotPassword />
            </AuthLayout>
          }
        />
        <Route
          path="/verify"
          element={
            <AuthLayout>
              <VerifyEmail />
            </AuthLayout>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              {user && onboardingEngine.isCompleted(user.id) ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Onboarding />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {user && !onboardingEngine.isCompleted(user.id) ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Dashboard
                  user={user!}
                  onDailyBreadShown={handleDailyBreadShown}
                  onLogout={() => setUser(null)}
                  onUpdateUser={(u) => setUser(u)}
                />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating particles rendering layer */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="floating-particle"
          style={{
            left: p.x,
            top: p.y,
            '--rotation': p.rotation,
          } as React.CSSProperties}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}

export default App;
