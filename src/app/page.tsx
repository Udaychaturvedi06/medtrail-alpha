'use client';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { LoginScreen } from '@/features/auth/components/LoginScreen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (profile?.role) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return null; // Will redirect in useEffect
}
