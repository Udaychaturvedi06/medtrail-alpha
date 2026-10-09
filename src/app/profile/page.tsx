'use client';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, UserCircle, Edit3, ShieldCheck, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  if (loading) return null;
  if (!user || !profile) {
    window.location.href = '/';
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      if (db) {
        // Prepare strict payload
        const updatePayload: any = {
          displayName: formData.displayName || formData.name || '',
          phone: formData.phone || '',
          emergencyContactEmail: formData.emergencyContactEmail || ''
        };
        if (formData.bloodGroup) {
          updatePayload.bloodGroup = formData.bloodGroup;
        }
        await updateDoc(doc(db, 'users', user.uid), updatePayload);
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (e) {
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
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
              <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-full shadow-sm">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full" />
                ) : (
                  <UserCircle className="w-24 h-24 text-gray-300 bg-white rounded-full" />
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
                  {!isEditing ? (
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-blue-50" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100" onClick={() => { setIsEditing(false); setFormData(profile); }}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button size="sm" className="bg-primary hover:bg-blue-700 text-white" onClick={handleSave} disabled={isSaving}>
                        <Check className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
                  {/* Full Name */}
                  <div className="py-2 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium w-1/3">Full Name</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.displayName || formData.name || ''} 
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        className="w-2/3 text-right font-semibold border-b border-primary/50 focus:border-primary outline-none bg-transparent"
                      />
                    ) : (
                      <span className="text-gray-900 font-semibold w-2/3 text-right">{profile.displayName || profile.name || 'Not set'}</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="py-2 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium w-1/3">Phone Number</span>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="10 digits"
                        className="w-2/3 text-right font-semibold border-b border-primary/50 focus:border-primary outline-none bg-transparent"
                      />
                    ) : (
                      <span className="text-gray-900 font-semibold w-2/3 text-right">{profile.phone || 'Not set'}</span>
                    )}
                  </div>

                  {/* Blood Group */}
                  <div className="py-2 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium w-1/3">Blood Group</span>
                    {isEditing ? (
                      <select 
                        value={formData.bloodGroup || ''} 
                        onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                        className="w-2/3 text-right font-semibold border-b border-primary/50 focus:border-primary outline-none bg-transparent appearance-none"
                      >
                        <option value="">Unknown</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                      </select>
                    ) : (
                      <span className="text-gray-900 font-semibold w-2/3 text-right">{profile.bloodGroup || 'Not set'}</span>
                    )}
                  </div>

                  {/* Emergency Contact */}
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium w-1/3">Emergency Contact</span>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={formData.emergencyContactEmail || ''} 
                        onChange={e => setFormData({...formData, emergencyContactEmail: e.target.value})}
                        placeholder="caregiver@email.com"
                        className="w-2/3 text-right font-semibold border-b border-primary/50 focus:border-primary outline-none bg-transparent"
                      />
                    ) : (
                      <span className="text-gray-900 font-semibold w-2/3 text-right">{profile.emergencyContactEmail || 'Not set'}</span>
                    )}
                  </div>
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
