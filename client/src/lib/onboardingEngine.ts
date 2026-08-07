export const onboardingEngine = {
  isCompleted(userId: number): boolean {
    return localStorage.getItem(`breadbuddy_onboarded_${userId}`) === 'true';
  },

  setCompleted(userId: number, completed: boolean): void {
    localStorage.setItem(`breadbuddy_onboarded_${userId}`, completed ? 'true' : 'false');
  },

  getResumeStep(userId: number): number {
    return Number(localStorage.getItem(`breadbuddy_onboarding_step_${userId}`) || '0');
  },

  saveResumeStep(userId: number, step: number): void {
    localStorage.setItem(`breadbuddy_onboarding_step_${userId}`, String(step));
  }
};
