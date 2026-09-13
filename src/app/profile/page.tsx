'use client';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, UserCircle, Edit3, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;
  if (!user || !profile) {
    window.location.href = '/';
    return null;
  }

  // Helper to render role-specific details
  const renderDetails = () => {
    const skipKeys = ['role', 'email', 'name', 'createdAt']; // Don't render these in the generic loop
    
    return Object.entries(profile).map(([key, value]) => {
      if (skipKeys.includes(key)) return null;
      
      // Format camelCase key to Title Case
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      return (
        <div key={key} className="py-3 border-b border-gray-100 last:border-0 flex justify-between items-center">
          <span className="text-gray-500 text-sm font-medium">{formattedKey}</span>
          <span className="text-gray-900 font-semibold">{String(value)}</span>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
            <div className="h-32 bg-gradient-to-r from-primary to-blue-500 relative">
              <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-full">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full" />
                ) : (
                  <UserCircle className="w-24 h-24 text-gray-300" />
                )}
              </div>
            </div>
            
            <CardHeader className="pt-16 pb-4 px-8">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">{user.displayName}</CardTitle>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold uppercase tracking-wider">
                  {profile.role}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-8 pb-8">
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                  <Button variant="ghost" size="sm" className="text-primary"><Edit3 className="w-4 h-4 mr-2" /> Edit</Button>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  {renderDetails()}
                </div>
              </div>
              
              {/* ABHA ID Integration Card */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Government Sync
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldCheck className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-orange-900 mb-2">Ayushman Bharat Health Account</h4>
                    <p className="text-sm text-orange-800/80 mb-5 max-w-md font-medium leading-relaxed">
                      Link your 14-digit ABHA ID to instantly sync lab reports and medical history from ABDM-compliant hospitals directly into your MedTrail timeline.
                    </p>
                    {profile.abhaId ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-orange-200 w-max">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-gray-700 font-mono tracking-wider">{profile.abhaId}</span>
                      </div>
                    ) : (
                      <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">
                        Link ABHA ID
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Account Security</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start text-gray-700 hover:bg-gray-100" onClick={() => toast.info('Auth Settings coming soon')}>Change Password / Auth Settings</Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => toast.error('Account deletion is disabled for safety')}>Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
