'use client';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Bell, FileText, LayoutDashboard, LogOut, Settings, ShieldAlert, HeartPulse, UserCircle, Users, Stethoscope, Calendar, Pill, Upload, ShieldCheck, ImageIcon, X, Eye, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ManualChecker } from '@/components/ManualChecker';
import Link from 'next/link';

type PortalRole = 'patient' | 'caregiver' | 'doctor';

export default function DashboardPage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  // Default to patient if profile fails to load for demo
  const role = profile?.role || 'patient';
  
  // Local records
  const [records, setRecords] = useState<any[]>([]);
  
  // Caregiver Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);

  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Selected Image for Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDeleteRecord = async (recordId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this prescription? This action cannot be undone.')) {
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        if (db) {
          await deleteDoc(doc(db, 'users', user.uid, 'records', recordId));
          toast.success('Prescription deleted.');
        }
      } catch (err) {
        toast.error('Failed to delete prescription.');
      }
    }
  };

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
    if (!loading && !user) {
      // Use window.location.href instead of router.push to force a hard reload
      // This prevents Next.js chunk mismatch errors (React Error 306) across deployments
      window.location.href = '/';
    }
  }, [user, loading]);

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

  if (loading || !user) {
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

  const SidebarItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
    <motion.a 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      href="#" 
      onClick={(e) => { e.preventDefault(); setActiveTab(id); }}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors ${
        activeTab === id ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" /> {label}
    </motion.a>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm z-20">
        <Link href="/dashboard" className="h-20 flex items-center gap-3 px-8 border-b border-gray-100 text-primary cursor-pointer hover:opacity-80 transition-opacity">
          <HeartPulse className="w-7 h-7" />
          <span className="font-extrabold text-2xl tracking-tight">MedTrail</span>
        </Link>
        
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Portal</div>
          <div className="text-primary font-bold capitalize">{role} View</div>
        </div>
        
        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
          
          {role === 'patient' && (
            <>
              <SidebarItem icon={FileText} label="My Prescriptions" id="prescriptions" />
              <SidebarItem icon={Activity} label="Interaction Checks" id="interactions" />
            </>
          )}
          
          {role === 'caregiver' && (
            <>
              <SidebarItem icon={Users} label="My Patients" id="patients" />
              <SidebarItem icon={Bell} label="SOS Alerts" id="alerts" />
            </>
          )}

          {role === 'doctor' && (
            <>
              <SidebarItem icon={Stethoscope} label="Patient Search" id="search" />
              <SidebarItem icon={Activity} label="Clinical Analytics" id="analytics" />
            </>
          )}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <SidebarItem icon={Settings} label="Settings" id="settings" />
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
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0">
          <Link href="/dashboard" className="flex md:hidden items-center gap-2 text-primary cursor-pointer hover:opacity-80 transition-opacity">
            <HeartPulse className="w-6 h-6" />
            <span className="font-bold text-lg">MedTrail</span>
          </Link>
          
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
              
              {activeTab === 'dashboard' && (
                <>
                  {/* Welcome Banner */}
                  <motion.div 
                    whileHover={{ y: -2 }}
                className="bg-gradient-to-r from-primary to-[#0f6b60] text-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <HeartPulse className="w-64 h-64" />
                </div>
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
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
                </>
              )}



              {/* Main Grid for Dashboard & Prescriptions */}
              {['dashboard', 'prescriptions'].includes(activeTab) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Timeline (Spans 2 cols on Dashboard, 3 cols on Prescriptions) */}
                  <div className={`${activeTab === 'prescriptions' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>

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
                    {activeTab !== 'prescriptions' && (
                      <Button variant="ghost" onClick={() => setActiveTab('prescriptions')} className="font-bold text-primary hover:bg-primary/10">View All →</Button>
                    )}
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
                                          {record.imageUrl && (
                                            <button 
                                              onClick={() => setSelectedImage(record.imageUrl)}
                                              className="text-primary hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
                                              title="View Original Prescription"
                                            >
                                              <ImageIcon className="w-3.5 h-3.5" />
                                              <span className="hidden sm:inline">View</span>
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => handleDeleteRecord(record.id)}
                                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shrink-0 ml-2"
                                            title="Delete Prescription"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
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

                {/* Interaction Alerts Side Panel - Dashboard Only */}
                {activeTab === 'dashboard' && (
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
                )}
                
              </div>
            )}

              {/* Interactions Tab */}
              {activeTab === 'interactions' && (
                <div className="pt-4">
                  <ManualChecker />
                </div>
              )}

              {/* Doctor Search Tab */}
              {activeTab === 'search' && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto text-center py-20">
                  <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Directory Search</h2>
                  <p className="text-gray-500 mb-6">Search for patients by email, phone, or MedTrail ID to view their clinical timeline and interaction warnings.</p>
                  <form 
                    className="flex max-w-md mx-auto gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).elements.namedItem('searchQuery') as HTMLInputElement;
                      const query = input.value.trim();
                      if (query.length < 3) {
                        toast.error('Search query must be at least 3 characters long.');
                        return;
                      }
                      // Search functionality goes here
                      toast.info(`Searching for: ${query}`);
                    }}
                  >
                    <input name="searchQuery" type="text" placeholder="Patient Email or ID" className="flex-1 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" />
                    <Button type="submit" className="px-6 font-bold">Search</Button>
                  </form>
                </div>
              )}

              {/* Caregiver Patients Tab */}
              {activeTab === 'patients' && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto text-center py-20">
                  <HeartPulse className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">My Patients</h2>
                  <p className="text-gray-500">You are monitoring 0 active patients. Patients must add your email to their Emergency Contacts in settings.</p>
                </div>
              )}

              {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                </div>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user) return;
                    
                    const form = e.target as HTMLFormElement;
                    const newName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
                    const newPhone = (form.elements.namedItem('phone') as HTMLInputElement).value;
                    const newEmergency = (form.elements.namedItem('emergency') as HTMLInputElement).value;
                    const bloodGroupInput = form.elements.namedItem('bloodGroup') as HTMLSelectElement | null;
                    const newBloodGroup = bloodGroupInput ? bloodGroupInput.value : undefined;
                    
                    try {
                      const { db } = await import('@/lib/firebase');
                      const { doc, updateDoc } = await import('firebase/firestore');
                      if (db) {
                        const updateData: any = {
                          displayName: newName,
                          phone: newPhone,
                          emergencyContactEmail: newEmergency
                        };
                        if (newBloodGroup !== undefined) {
                          updateData.bloodGroup = newBloodGroup;
                        }
                        await updateDoc(doc(db, 'users', user.uid), updateData);
                        toast.success('Settings updated successfully!');
                      }
                    } catch (err) {
                      toast.error('Failed to update settings');
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                      <input 
                        name="displayName"
                        type="text" 
                        defaultValue={profile?.displayName || profile?.name || ''}
                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                      <input 
                        name="phone"
                        type="tel" 
                        pattern="^[0-9]{10}$"
                        title="Enter exactly 10 digits" placeholder="e.g. 9876543210"
                        defaultValue={profile?.phone || ''}
                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                    {role === 'patient' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Group</label>
                        <select 
                          name="bloodGroup" 
                          defaultValue={profile?.bloodGroup || ''}
                          className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary outline-none bg-white"
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4"/> Emergency Contact (Caregiver Email)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">This person will receive SOS alerts if severe drug interactions are detected.</p>
                    <input 
                      name="emergency"
                      type="email" 
                      defaultValue={profile?.caregiverEmail || profile?.emergencyContactEmail || ''}
                      placeholder="doctor@hospital.com or family@email.com"
                      className="w-full border border-red-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none bg-red-50/30" 
                    />
                  </div>

                  <div className="pt-6">
                    <Button type="submit" className="w-full sm:w-auto font-bold px-8 bg-primary hover:bg-primary/90">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation & SOS */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-200 z-40 px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex justify-between items-center relative">
          <button className="flex flex-col items-center p-2 text-primary" onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          
          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-primary transition-colors" onClick={() => setActiveTab('prescriptions')}>
            <FileText className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Records</span>
          </button>

          {/* Floating SOS Button */}
          <div className="relative -top-8">
            <button 
              onClick={triggerSOS}
              className="bg-red-600 text-white p-4 rounded-full shadow-[0_8px_16px_rgba(220,38,38,0.4)] flex flex-col items-center justify-center border-4 border-[#f8fafc] active:scale-95 transition-transform"
            >
              <ShieldAlert className="w-7 h-7" />
            </button>
          </div>
          
          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-primary transition-colors" onClick={() => setActiveTab('settings')}>
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>

          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-red-500 transition-colors" onClick={handleLogout}>
            <LogOut className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Logout</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing modal
            >
              <img 
                src={selectedImage} 
                alt="Prescription Document" 
                className="w-full h-full object-contain max-h-[90vh]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
