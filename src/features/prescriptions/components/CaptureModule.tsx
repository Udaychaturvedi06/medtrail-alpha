'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, X, CheckCircle2, Loader2, Clock, FolderPlus, Edit3, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type CaptureMode = 'select' | 'camera' | 'preview' | 'processing' | 'review' | 'result';

export function CaptureModule() {
  const [mode, setMode] = useState<CaptureMode>('select');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  
  // Form State
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [folder, setFolder] = useState('General');
  const [reminders, setReminders] = useState<string[]>([]);
  const [newReminderTime, setNewReminderTime] = useState('');

  const webcamRef = useRef<Webcam>(null);
  const { user } = useAuth();
  const router = useRouter();

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImageSrc(imageSrc);
      setMode('preview');
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setImageSrc(null);
    setMode('select');
    setOcrData(null);
    setReminders([]);
  };

  const handleProcessImage = async () => {
    if (!imageSrc) return;
    setMode('processing');
    
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageSrc })
      });
      const responseData = await res.json();
      
      if (!res.ok) throw new Error(responseData.error || 'OCR Processing failed');
      
      setOcrData(responseData.data);
      setMedName(responseData.data.medicationName || '');
      setDosage(responseData.data.dosage || '');
      setMode('review');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to process image');
      setMode('preview');
    }
  };

  const handleAddReminder = () => {
    if (newReminderTime && !reminders.includes(newReminderTime)) {
      setReminders([...reminders, newReminderTime]);
      setNewReminderTime('');
    }
  };

  const handleRemoveReminder = (time: string) => {
    setReminders(reminders.filter(t => t !== time));
  };

  const handleFinalSave = () => {
    if (!medName) {
      toast.error('Medication name is required');
      return;
    }

    if (user?.uid) {
      const storageKey = `medtrail_records_${user.uid}`;
      const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const newRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        medicationName: medName,
        dosage: dosage,
        folder: folder,
        reminders: reminders,
        rawOcrData: ocrData // keep original for reference
      };
      
      localStorage.setItem(storageKey, JSON.stringify([...existingRecords, newRecord]));
      toast.success('Record saved to folder successfully!');
    }
    setMode('result');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle>Add Medication</CardTitle>
        <CardDescription>Upload a prescription or medicine strip for automatic extraction.</CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'select' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-32 flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50"
              onClick={() => setMode('camera')}
            >
              <Camera className="h-8 w-8 text-gray-500" />
              <span className="font-semibold text-gray-700">Open Camera</span>
            </Button>
            
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <div className="h-32 flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50 rounded-md">
                <Upload className="h-8 w-8 text-gray-500" />
                <span className="font-semibold text-gray-700">Upload Image</span>
              </div>
            </label>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4 flex flex-col items-center">
            <div className="relative w-full overflow-hidden rounded-lg bg-black flex justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full max-w-md h-auto"
              />
            </div>
            <div className="flex gap-4 w-full max-w-md">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button className="flex-1" onClick={capture}>
                <Camera className="mr-2 h-4 w-4" /> Capture
              </Button>
            </div>
            <p className="text-sm text-gray-500 text-center">Ensure the text is clearly visible without glare.</p>
          </div>
        )}

        {mode === 'preview' && imageSrc && (
          <div className="space-y-4 flex flex-col items-center">
            <div className="relative w-full max-w-md border rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="Captured preview" className="w-full h-auto object-contain" />
            </div>
            <div className="flex gap-4 w-full max-w-md">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                Retake
              </Button>
              <Button className="flex-1 bg-primary text-white" onClick={handleProcessImage}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Analyze with AI
              </Button>
            </div>
          </div>
        )}

        {mode === 'processing' && (
          <div className="space-y-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-gray-900">Gemini AI is analyzing the image...</h3>
              <p className="text-sm text-gray-500">Extracting medication name and dosage.</p>
            </div>
          </div>
        )}

        {mode === 'review' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5" /> Verify & Save Record
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Medication Name</label>
                  <input 
                    type="text" 
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage</label>
                  <input 
                    type="text" 
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-gray-500" /> Save to Folder
                  </label>
                  <select 
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none bg-white font-medium"
                  >
                    <option value="General">General / Uncategorized</option>
                    <option value="Cardiology">Cardiology (Heart)</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Short Term">Short Term / Antibiotics</option>
                    <option value="Vitamins">Vitamins & Supplements</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" /> Set Reminders
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="time" 
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="border border-gray-300 rounded-lg p-2 outline-none flex-1"
                    />
                    <Button onClick={handleAddReminder} variant="secondary" className="px-3">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>
                  
                  {reminders.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {reminders.map((time, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-bold">
                          {time}
                          <button onClick={() => handleRemoveReminder(time)} className="hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No reminders set.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                Discard
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleFinalSave}>
                Save Record
              </Button>
            </div>
          </div>
        )}

        {mode === 'result' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-green-900 text-2xl mb-2">Record Saved!</h3>
              <p className="text-green-800 text-sm font-medium">It has been added to the {folder} folder with {reminders.length} reminder(s).</p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <Button variant="outline" className="flex-1 font-bold" onClick={handleRetake}>
                Scan Another
              </Button>
              <Button className="flex-1 font-bold" onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
