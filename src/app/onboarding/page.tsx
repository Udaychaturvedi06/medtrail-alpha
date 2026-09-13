'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { HeartPulse, Stethoscope, Users, User, ArrowRight } from 'lucide-react';

type Role = 'patient' | 'caregiver' | 'doctor';

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRole) return;
    
    setIsSubmitting(true);
    try {
      const profileData = {
        role: selectedRole,
        email: user.email,
        name: user.displayName,
        createdAt: new Date().toISOString(),
        ...formData
      };
      
      // Save to Firestore
      if (db) {
        await setDoc(doc(db, 'users', user.uid), profileData);
      }
      
      await refreshProfile(); // Pull new role into context
      toast.success('Profile created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
      setIsSubmitting(false);
    }
  };

  if (!user) return null; // Let global protection handle it

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-blue-400" />
        
        <div className="p-8 md:p-12 pt-10">
          <div className="flex items-center justify-center mb-8 text-primary">
            <HeartPulse className="w-10 h-10" />
          </div>
          
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-3xl font-bold text-center mb-2">Welcome to MedTrail</h1>
              <p className="text-gray-500 text-center mb-10">How will you be using our platform?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => handleRoleSelect('patient')} className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-gray-700 hover:text-primary group">
                  <User className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">Patient</span>
                  <span className="text-xs text-center mt-2 opacity-70">Track my own health & meds</span>
                </button>
                
                <button onClick={() => handleRoleSelect('caregiver')} className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-gray-700 hover:text-primary group">
                  <Users className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">Caregiver</span>
                  <span className="text-xs text-center mt-2 opacity-70">Monitor my family members</span>
                </button>
                
                <button onClick={() => handleRoleSelect('doctor')} className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-gray-700 hover:text-primary group">
                  <Stethoscope className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">Doctor</span>
                  <span className="text-xs text-center mt-2 opacity-70">Review clinical records</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && selectedRole && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-2xl font-bold mb-2">Let's get some basic details</h1>
              <p className="text-gray-500 mb-8 capitalize">Setting up your {selectedRole} profile.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {selectedRole === 'patient' && (
                  <>
                    <div>
                      <Label>Age</Label>
                      <Input name="age" type="number" required placeholder="e.g. 65" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div>
                      <Label>Blood Group</Label>
                      <Input name="bloodGroup" required placeholder="e.g. O+" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div>
                      <Label>Emergency Contact Number</Label>
                      <Input name="emergencyContact" type="tel" required placeholder="Phone number" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <Label className="text-primary font-bold">Caregiver's Email Address</Label>
                      <p className="text-xs text-gray-500 mb-2">They will receive instant alerts if dangerous drug interactions are detected.</p>
                      <Input name="caregiverEmail" type="email" required placeholder="caregiver@email.com" onChange={handleInputChange} className="mt-1 border-primary/30" />
                    </div>
                  </>
                )}
                
                {selectedRole === 'caregiver' && (
                  <>
                    <div>
                      <Label>Your Phone Number</Label>
                      <Input name="phone" type="tel" required placeholder="For SOS alerts" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div>
                      <Label>Primary Relationship to Patient</Label>
                      <Input name="relationship" required placeholder="e.g. Son, Daughter, Nurse" onChange={handleInputChange} className="mt-1" />
                    </div>
                  </>
                )}

                {selectedRole === 'doctor' && (
                  <>
                    <div>
                      <Label>Medical License Number</Label>
                      <Input name="license" required placeholder="e.g. MCI-12345" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div>
                      <Label>Specialty</Label>
                      <Input name="specialty" required placeholder="e.g. Cardiologist" onChange={handleInputChange} className="mt-1" />
                    </div>
                    <div>
                      <Label>Clinic / Hospital Name</Label>
                      <Input name="clinic" required placeholder="e.g. City Hospital" onChange={handleInputChange} className="mt-1" />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="mt-1 w-4 h-4 text-primary rounded border-gray-300" />
                    <span className="text-sm text-gray-600">
                      <strong>DPDP Act Consent:</strong> I explicitly consent to the collection, processing, and secure storage of my personal and medical data by MedTrail for the purpose of health monitoring and drug interaction safety, in accordance with the Digital Personal Data Protection Act, 2023.
                    </span>
                  </label>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                  <Button type="submit" disabled={isSubmitting} className="w-2/3">
                    {isSubmitting ? 'Saving...' : 'Complete Profile'} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
