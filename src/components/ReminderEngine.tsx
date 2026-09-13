'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toast } from 'sonner';

export function ReminderEngine() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    let unsubRecords: any = null;
    let records: any[] = [];

    const setupFirestore = async () => {
      const { db } = await import('@/lib/firebase');
      const { collection, onSnapshot } = await import('firebase/firestore');
      if (!db || !isMounted) return;

      unsubRecords = onSnapshot(collection(db, 'users', user.uid, 'records'), (snapshot) => {
        records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });
    };
    setupFirestore();

    const interval = setInterval(() => {
      if (records.length === 0) return;
      
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      
      const notifiedKey = `medtrail_notified_${user.uid}`;
      const alreadyNotified = JSON.parse(sessionStorage.getItem(notifiedKey) || '[]');

      records.forEach((record: any) => {
        if (record.reminders && Array.isArray(record.reminders)) {
          record.reminders.forEach((reminderTime: string) => {
            if (reminderTime === currentTimeString) {
              const notificationId = `${record.id}_${currentTimeString}_${now.toDateString()}`;
              
              if (!alreadyNotified.includes(notificationId)) {
                toast.success(`Time to take your medication: ${record.medicationName}`, {
                  description: `Dosage: ${record.dosage || 'As prescribed'}`,
                  duration: 10000,
                  icon: '💊'
                });
                
                alreadyNotified.push(notificationId);
                
                if (alreadyNotified.length > 50) {
                  alreadyNotified.shift();
                }
                
                sessionStorage.setItem(notifiedKey, JSON.stringify(alreadyNotified));
              }
            }
          });
        }
      });
    }, 30000); // Check every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (unsubRecords) unsubRecords();
    };
  }, [user]);

  return null; 
}
