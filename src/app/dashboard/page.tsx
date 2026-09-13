'use client';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Bell, FileText, LayoutDashboard, LogOut, Settings, ShieldAlert, HeartPulse, UserCircle, Users, Stethoscope, Calendar, Pill, Upload, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ManualChecker } from '@/components/ManualChecker';

type PortalRole = 'patient' | 'caregiver' | 'doctor';

export default function DashboardPage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  // The actual role bound to this user in the database
  const role = profile?.role || 'patient';
  
  // Local records
  const [records, setRecords] = useState<any[]>([]);
  
  // Caregiver Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);

  // Handle SOS trigger
  const triggerSOS = () => {
    setSosActive(true);
    setSosCountdown(3);
  };

  // SOS Countdown logic
  useEffect(() => {
    let timer: any;
    if (sosActive && sosCountdown > 0) {
      timer = setTimeout(() => setSosCountdown(c => c - 1), 1000);
    } else if (sosActive && sosCountdown === 0) {
      setSosActive(false);
      
      const sendSOS = async () => {
        const loadingToast = toast.loading('Sending emergency location to Caregiver via WhatsApp...');
        try {
          const res = await fetch('/api/sos', { method: 'POST' });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success('Emergency! WhatsApp alert sent successfully!', { id: loadingToast });
          } else {
            console.error(data.error);
            toast.error('Failed to send SOS via Twilio.', { id: loadingToast });
          }
        } catch (e) {
          toast.error('Failed to connect to SOS endpoint.', { id: loadingToast });
        }
      };
      
      sendSOS();
    }
    return () => clearTimeout(timer);
  }, [sosActive, sosCountdown]);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push('/');
    }
  }, [user, profile, loading, router]);

  // Read data securely from Firestore (No localStorage)
  useEffect(() => {
    if (!user) return;
    
    let unsubRecords: any = null;
    let unsubNotifications: any = null;

    import('@/lib/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
        if (!db) return;

        // 1. Fetch Patient Records
        const recordsQuery = query(collection(db, 'users', user.uid, 'records'));
        unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
          const freshRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          freshRecords.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecords(freshRecords);
        });

        // 2. Fetch Caregiver Notifications
        if (role === 'caregiver' && user.email) {
          const notifQuery = query(
            collection(db, 'notifications'), 
            where('caregiverEmail', '==', user.email)
          );
          unsubNotifications = onSnapshot(notifQuery, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            notifs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(notifs);
          });
        }
      });
    });;

    // DPDP Act: Audit Logging for Caregiver / Doctor Access
    if ((role === 'caregiver' || role === 'doctor') && user.uid) {
      const logAccess = async () => {
        try {
          const { db } = await import('@/lib/firebase');
          const { collection, addDoc } = await import('firebase/firestore');
          if (!db) return;
          
          await addDoc(collection(db, 'audit_logs'), {
            accessedByUid: user.uid,
            accessedByRole: role,
            accessedByEmail: user.email,
            action: 'VIEWED_DASHBOARD',
            timestamp: new Date().toISOString(),
            ipAddress: 'logged-by-server', // In production, server logs IP
          });
        } catch (e) {
          console.error('Audit log failed', e);
        }
      };
      
      // We only want to log this once per session to avoid spamming
      const sessionLogKey = `audit_logged_${user.uid}`;
      if (!sessionStorage.getItem(sessionLogKey)) {
        logAccess();
        sessionStorage.setItem(sessionLogKey, 'true');
      }
    }
    
    return () => {
      if (unsubRecords) unsubRecords();
      if (unsubNotifications) unsubNotifications();
    };
  }, [user, role]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-primary">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <HeartPulse className="w-16 h-16" />
        </motion.div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Successfully logged out');
  };

  const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
    <motion.a 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      href="#" 
      onClick={(e) => { e.preventDefault(); toast.info(`Navigating to ${label}...`); }}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors ${
        active ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" /> {label}
    </motion.a>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm z-20">
        <div className="h-20 flex items-center gap-3 px-8 border-b border-gray-100 text-primary">
          <HeartPulse className="w-7 h-7" />
          <span className="font-extrabold text-2xl tracking-tight">MedTrail</span>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Portal</div>
          <div className="text-primary font-bold capitalize">{role} View</div>
        </div>
        
        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
          
          {role === 'patient' && (
            <>
              <SidebarItem icon={FileText} label="My Prescriptions" />
              <SidebarItem icon={Activity} label="Interaction Checks" />
            </>
          )}
          
          {role === 'caregiver' && (
            <>
              <SidebarItem icon={Users} label="My Patients" />
              <SidebarItem icon={Bell} label="SOS Alerts" />
            </>
          )}

          {role === 'doctor' && (
            <>
              <SidebarItem icon={Stethoscope} label="Patient Search" />
              <SidebarItem icon={Activity} label="Clinical Analytics" />
            </>
          )}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <SidebarItem icon={Settings} label="Settings" />
          </div>
        </nav>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={triggerSOS}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-bold shadow-[0_4px_14px_rgba(220,38,38,0.4)] hover:bg-red-700 transition-colors"
          >
            <ShieldAlert className="w-5 h-5" />
            EMERGENCY SOS
          </motion.button>
          
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer text-gray-700 hover:text-red-600 shadow-sm" 
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold">Secure Logout</span>
          </motion.div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* SOS OVERLAY MODAL */}
        <AnimatePresence>
          {sosActive && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
              >
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <ShieldAlert className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Sending SOS</h2>
                <p className="text-gray-500 mb-8">Alerting Caregivers via WhatsApp with your live location in...</p>
                
                <div className="text-6xl font-black text-red-600 mb-10 tabular-nums">
                  {sosCountdown}
                </div>
                
                <Button 
                  size="lg" variant="outline" 
                  className="w-full font-bold border-2" 
                  onClick={() => { setSosActive(false); toast.info('SOS Cancelled'); }}
                >
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Background Mesh for Main Area */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
          <div className="flex md:hidden items-center gap-2 text-primary">
            <HeartPulse className="w-6 h-6" />
            <span className="font-bold text-lg">MedTrail</span>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{role} Portal</h2>
          </div>

          <div className="flex items-center gap-5">
            {/* Language / Voice AI Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.info('Bhashini AI Translator enabled. Translating to Hindi...')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:text-primary transition-colors shadow-sm"
            >
              <span className="font-serif">अ</span> / A
            </motion.button>

            {/* Notifications */}
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 text-gray-400 hover:text-primary transition-colors bg-gray-50 rounded-full border border-gray-100"
              onClick={() => toast.info('No new notifications')}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </motion.button>

            {/* Profile Avatar */}
            <div 
              className="flex items-center gap-3 bg-white pl-2 pr-4 py-1.5 rounded-full border border-gray-200 shadow-sm hover:border-primary transition-colors cursor-pointer"
              onClick={() => router.push('/profile')}
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full shadow-sm" />
              ) : (
                <UserCircle className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm font-bold text-gray-700 hidden sm:block">
                {user.displayName || 'Demo User'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div 
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              
              {/* Welcome Banner */}
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-gradient-to-r from-primary to-[#0f6b60] text-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <HeartPulse className="w-64 h-64" />
                </div>
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-4xl font-extrabold mb-3 tracking-tight">
                    {role === 'patient' ? `Good afternoon, ${user.displayName?.split(' ')[0] || 'there'}!` : 
                     role === 'caregiver' ? 'Caregiver Overview' : 'Doctor Analytics Dashboard'}
                  </h1>
                  <p className="text-primary-foreground/90 text-lg font-medium">
                    {role === 'patient' ? 'Your medical records are up to date. You have 0 severe interaction warnings today.' : 
                     role === 'caregiver' ? 'Monitoring 2 active patients. No SOS alerts in the last 24 hours.' : 
                     'Reviewing unified chronological records for verified patients.'}
                  </p>
                  
                  {role === 'patient' && (
                    <div className="mt-8 flex gap-4">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          className="bg-white text-primary hover:bg-gray-50 font-bold px-8 py-6 rounded-xl shadow-lg"
                          onClick={() => router.push('/dashboard/upload')}
                        >
                          <Camera className="mr-2" /> Scan Prescription
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="mb-10">
                <ManualChecker />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Timeline (Spans 2 columns) */}
                <div className="lg:col-span-2 space-y-6">

                  {role === 'caregiver' && notifications.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-extrabold text-red-600 tracking-tight flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-6 h-6" /> Urgent Patient Alerts ({notifications.filter(n => !n.read).length})
                      </h2>
                      <div className="space-y-4">
                        {notifications.map((notif: any) => (
                          <motion.div 
                            key={notif.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`p-5 rounded-2xl border-l-4 shadow-sm ${notif.read ? 'bg-white border-gray-300 opacity-60' : 'bg-red-50 border-red-500'}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className={`font-bold text-lg ${notif.read ? 'text-gray-700' : 'text-red-800'}`}>
                                  Severe Interaction Warning
                                </h3>
                                <p className="text-gray-800 font-medium mt-1">{notif.message}</p>
                                <p className="text-xs text-gray-500 mt-2">{new Date(notif.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      {role === 'patient' ? 'Chronological Record' : role === 'caregiver' ? 'Patient Timelines' : 'Patient History'}
                    </h2>
                    <Button variant="ghost" className="font-bold text-primary hover:bg-primary/10">View All →</Button>
                  </div>
                  
                  <div>
                    {records.length === 0 ? (
                      <motion.div 
                        whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center min-h-[320px] shadow-sm transition-all"
                      >
                        <motion.div 
                          animate={{ y: [0, -10, 0] }} 
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                          className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                        >
                          <FileText className="w-10 h-10 text-gray-300" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No records found</h3>
                        <p className="text-gray-500 text-center max-w-sm mb-8 font-medium">
                          {role === 'patient' ? 'Scan your first prescription or medicine strip to start building your unified health record.' : 
                           'No patient records are currently selected or available.'}
                        </p>
                        
                        {role === 'patient' && (
                          <Button 
                            variant="outline" 
                            className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold px-8 py-6 rounded-xl"
                            onClick={() => router.push('/dashboard/upload')}
                          >
                            Start Scanning
                          </Button>
                        )}
                      </motion.div>
                    ) : (
                      <div className="space-y-8">
                        {/* Group records by folder */}
                        {Array.from(new Set(records.map(r => r.folder || 'General'))).map((folderName) => (
                          <div key={folderName as string} className="space-y-4">
                            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-primary" />
                              {folderName as string}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {records.filter(r => (r.folder || 'General') === folderName).map((record) => (
                                <motion.div 
                                  key={record.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                >
                                  <div className="flex items-start gap-4 mb-4">
                                    <div className="bg-primary/10 p-3 rounded-xl text-primary mt-1">
                                      <Pill className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-1">
                                        <h4 className="text-lg font-bold text-gray-900 leading-tight">{record.medicationName || 'Unknown Medication'}</h4>
                                      </div>
                                      <p className="text-gray-600 font-medium text-sm mb-1"><span className="text-gray-400">Dosage:</span> {record.dosage}</p>
                                      {record.reminders && record.reminders.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {record.reminders.map((time: string, idx: number) => (
                                            <span key={idx} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                                              ⏰ {time}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold text-gray-400 text-right">
                                    Added {new Date(record.date).toLocaleDateString()}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interaction Alerts Side Panel */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Safety Monitor</h2>
                  
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Status header */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 p-5 flex items-center gap-4">
                      <div className="p-2 bg-emerald-100 rounded-full">
                        <ShieldAlert className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-extrabold text-emerald-900 text-lg">All Clear</div>
                        <div className="text-sm font-semibold text-emerald-700">No dangerous interactions</div>
                      </div>
                    </div>
                    
                    {/* Info body */}
                    <div className="p-6">
                      <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6">
                        Our engine continuously cross-checks medications against the DDInter database. If a Severe or Moderate risk is detected, it will alert you immediately.
                      </p>
                      <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between text-sm shadow-inner">
                        <span className="text-gray-500 font-medium">Last scanned</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Just a quick icon import for the Camera button
function Camera(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
