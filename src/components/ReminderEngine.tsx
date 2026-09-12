'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toast } from 'sonner';

export function ReminderEngine() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    // Check reminders every 30 seconds
    const interval = setInterval(() => {
      const storageKey = `medtrail_records_${user.uid}`;
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const now = new Date();
      // Format current time to HH:MM (24-hour format)
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      // Keep track of notified reminders to prevent spamming
      // We will store "YYYY-MM-DD-HH:MM"
      const dateStr = now.toISOString().split('T')[0];
      const timeKey = `${dateStr}-${currentTimeStr}`;
      
      const notifiedKey = `medtrail_notified_${user.uid}`;
      const alreadyNotified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
      
      if (alreadyNotified.includes(timeKey)) return;

      let triggered = false;

      records.forEach((record: any) => {
        if (record.reminders && record.reminders.includes(currentTimeStr)) {
          // Play a loud alert!
          toast.message(`Time for Medication: ${record.medicationName}`, {
            description: `Dosage: ${record.dosage || 'Check prescription'}\nFolder: ${record.folder || 'General'}`,
            duration: 15000,
            icon: '⏰',
            action: {
              label: 'Mark as Taken',
              onClick: () => toast.success('Medication marked as taken!'),
            },
          });
          triggered = true;
        }
      });

      if (triggered) {
        // Save that we notified for this exact minute so we don't spam if it checks again within the same minute
        alreadyNotified.push(timeKey);
        // keep only the last 50 to prevent localstorage bloat
        if (alreadyNotified.length > 50) alreadyNotified.shift();
        localStorage.setItem(notifiedKey, JSON.stringify(alreadyNotified));
      }

    }, 30000); // run every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  return null; // This is a headless component
}
