'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, X, CheckCircle2, Loader2, Clock, FolderPlus, Edit3, Plus, Trash2, AlertTriangle, FileText, User, Stethoscope, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type CaptureMode = 'select' | 'camera' | 'preview' | 'processing' | 'review' | 'result';

type ExtractedDrug = {
  id: string;
  medicationName: string;
  dosage: string;
  duration: string;
  folder: string;
  reminders: string[];
  rxcui: string | null;
  ingredient: string | null;
  rxcuiStatus: 'pending' | 'success' | 'failed' | 'idle';
  interactionResult: any | null;
};

type PrescriptionMeta = {
  documentType: string;
  doctorName: string;
  diagnosis: string;
  advice: string;
  followUp: string;
};

export function CaptureModule() {
  const [mode, setMode] = useState<CaptureMode>('select');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  const [extractedDrugs, setExtractedDrugs] = useState<ExtractedDrug[]>([]);
  const [prescriptionMeta, setPrescriptionMeta] = useState<PrescriptionMeta | null>(null);
  const [newReminderTime, setNewReminderTime] = useState<{ [key: string]: string }>({});
  
  const [isSaving, setIsSaving] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleRetake = () => {
    setImageSrc(null);
    setMode('select');
    setExtractedDrugs([]);
    setPrescriptionMeta(null);
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const src = webcamRef.current.getScreenshot();
      setImageSrc(src);
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
      
      // New format extracts metadata and medications array
      const apiData = responseData.data;
      
      setPrescriptionMeta({
        documentType: apiData.documentType || 'UNKNOWN',
        doctorName: apiData.doctorName || '',
        diagnosis: apiData.diagnosis || '',
        advice: apiData.advice || '',
        followUp: apiData.followUp || ''
      });
      
      const dataArray = Array.isArray(apiData.medications) ? apiData.medications : [];
      
      const initialDrugs: ExtractedDrug[] = dataArray.map((d: any) => ({
        id: Math.random().toString(36).substring(7),
        medicationName: d.medicationName || '',
        dosage: d.dosage || '',
        duration: d.duration || '',
        folder: 'General',
        reminders: d.frequency ? guessReminders(d.frequency) : [],
        rxcui: null,
        ingredient: null,
        rxcuiStatus: 'idle',
        interactionResult: null
      }));
      
      setExtractedDrugs(initialDrugs);
      setMode('review');
      
      // Auto trigger verification for all
      initialDrugs.forEach(drug => verifyDrug(drug.id, drug.medicationName));
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to analyze image. Please try again.');
      setMode('preview');
    }
  };

  const guessReminders = (freq: string): string[] => {
    const f = freq.toLowerCase();
    if (f.includes('twice') || f.includes('2 times') || f.includes('bd') || f.includes('bid')) return ['09:00', '21:00'];
    if (f.includes('thrice') || f.includes('3 times') || f.includes('tds') || f.includes('tid')) return ['09:00', '14:00', '21:00'];
    if (f.includes('night') || f.includes('bed')) return ['21:00'];
    if (f.includes('morning')) return ['09:00'];
    return ['09:00'];
  };

  const verifyDrug = async (id: string, name: string) => {
    if (!name) return;
    updateDrug(id, { rxcuiStatus: 'pending' });
    try {
      const res = await fetch(`/api/rxnorm?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.rxcui && data.ingredient) {
        updateDrug(id, { 
          rxcui: data.rxcui, 
          ingredient: data.ingredient,
          rxcuiStatus: 'success' 
        });
        checkInteractions(id, data.ingredient);
      } else {
        updateDrug(id, { rxcuiStatus: 'failed' });
        checkInteractions(id, name);
      }
    } catch (e) {
      updateDrug(id, { rxcuiStatus: 'failed' });
      checkInteractions(id, name);
    }
  };

  const checkInteractions = async (id: string, newIngredient: string) => {
    try {
      if (!user?.uid) return;
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      if (!db) return;

      const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'records'));
      const existingIngredients: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ingredient) existingIngredients.push(data.ingredient);
        else if (data.medicationName) existingIngredients.push(data.medicationName);
      });

      if (existingIngredients.length === 0) return;
      const idToken = await user.getIdToken();

      const res = await fetch('/api/check-interaction', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          newDrugIngredient: newIngredient,
          existingDrugIngredients: existingIngredients
        })
      });
      
      const data = await res.json();
      if (data.highestSeverity && data.highestSeverity !== 'None') {
        updateDrug(id, { interactionResult: data });
        if (data.highestSeverity === 'Major') {
          toast.error(`SEVERE INTERACTION for ${newIngredient}`, { duration: 5000 });
        }
      }
    } catch (e) {
      console.error('Interaction check failed', e);
    }
  };

  const updateDrug = (id: string, updates: Partial<ExtractedDrug>) => {
    setExtractedDrugs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const removeDrug = (id: string) => {
    setExtractedDrugs(prev => prev.filter(d => d.id !== id));
  };

  const addDrug = () => {
    setExtractedDrugs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      medicationName: '',
      dosage: '',
      duration: '',
      folder: 'General',
      reminders: [],
      rxcui: null,
      ingredient: null,
      rxcuiStatus: 'idle',
      interactionResult: null
    }]);
  };

  const handleFinalSave = async () => {
    if (!user || extractedDrugs.length === 0) {
      toast.error('No drugs to save');
      return;
    }

    // Validation Check
    for (const drug of extractedDrugs) {
      if (drug.medicationName.trim().length < 2) {
        toast.error(`Invalid medication name: "${drug.medicationName}". Please enter a valid name.`);
        return;
      }
      if (!drug.dosage || drug.dosage.trim().length === 0) {
        toast.error(`Please specify a valid dosage for ${drug.medicationName}`);
        return;
      }
      if (!drug.duration || drug.duration.trim().length === 0) {
        toast.error(`Please specify a duration for ${drug.medicationName} (e.g. "5 days")`);
        return;
      }
    }
    
    setIsSaving(true);
    let uploadedImageUrl = '';
    
    try {
      if (imageSrc) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (cloudName && uploadPreset) {
          const formData = new FormData();
          formData.append('file', imageSrc);
          formData.append('upload_preset', uploadPreset);
          formData.append('folder', `medtrail_prescriptions/${user.uid}`);

          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
          });

          if (uploadRes.ok) {
            const cloudinaryData = await uploadRes.json();
            uploadedImageUrl = cloudinaryData.secure_url;
          } else {
            uploadedImageUrl = imageSrc || ''; 
          }
        } else {
          uploadedImageUrl = imageSrc || ''; 
        }
      }
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      uploadedImageUrl = imageSrc || '';
    }

    try {
      const { db } = await import('@/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      if (!db) return;

      const dateStr = new Date().toISOString();

      await Promise.all(extractedDrugs.map(async (drug) => {
        const recordId = `rec_${Date.now()}_${drug.id}`;
        const newRecord = {
          id: recordId,
          date: dateStr,
          medicationName: drug.medicationName,
          dosage: drug.dosage,
          duration: drug.duration,
          folder: drug.folder,
          reminders: drug.reminders,
          rxcui: drug.rxcui,
          ingredient: drug.ingredient,
          imageUrl: uploadedImageUrl,
          rawOcrData: drug,
          prescriptionMeta: prescriptionMeta // attach the prescription metadata to every drug
        };
        await setDoc(doc(db, 'users', user.uid, 'records', recordId), newRecord);
      }));

      toast.success(`Saved ${extractedDrugs.length} medications successfully!`);
      setMode('result');
    } catch (e) {
      console.error('Failed to save to Firestore', e);
      toast.error('Failed to save records');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl border-0 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-blue-500 p-6 text-white text-center">
        <h2 className="text-2xl font-extrabold flex justify-center items-center gap-2">
          {mode === 'select' && <><Camera /> Scan Document</>}
          {mode === 'camera' && <><Camera /> Camera Active</>}
          {mode === 'preview' && <><Upload /> Confirm Image</>}
          {mode === 'processing' && <><Loader2 className="animate-spin" /> Analyzing...</>}
          {mode === 'review' && <><Edit3 /> Review & Confirm</>}
          {mode === 'result' && <><CheckCircle2 /> Success</>}
        </h2>
        <p className="opacity-90 mt-1 font-medium">
          {mode === 'select' && "Upload a prescription or medicine strip"}
          {mode === 'review' && "Verify the extracted medications and metadata before saving"}
        </p>
      </div>

      <CardContent className="p-6">
        {mode === 'select' && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center py-8">
            <Button size="lg" className="h-32 flex-1 text-lg flex flex-col gap-3 rounded-2xl" onClick={() => setMode('camera')}>
              <Camera className="w-8 h-8" /> Use Camera
            </Button>
            <Button size="lg" variant="outline" className="h-32 flex-1 text-lg flex flex-col gap-3 rounded-2xl relative overflow-hidden">
              <Upload className="w-8 h-8" /> Upload File
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
            </Button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] md:aspect-video flex items-center justify-center">
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: 'environment' }} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-white/20 m-4 rounded-xl pointer-events-none" />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 font-bold" onClick={capture}>Capture Photo</Button>
            </div>
          </div>
        )}

        {mode === 'preview' && imageSrc && (
          <div className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
              <img src={imageSrc} alt="Document Preview" className="w-full max-h-[50vh] object-contain bg-gray-50" />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>Retake</Button>
              <Button className="flex-1 font-bold" onClick={handleProcessImage}>Analyze Document</Button>
            </div>
          </div>
        )}

        {mode === 'processing' && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-gray-800">Reading Medical Data...</h3>
            <p className="text-gray-500 font-medium">Extracting Doctor's notes and medications.</p>
          </div>
        )}

        {mode === 'review' && (
          <div className="space-y-6">
            {/* Prescription Metadata Panel */}
            {prescriptionMeta && prescriptionMeta.documentType === 'PRESCRIPTION' && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-6">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5"/> Prescription Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Doctor / Clinic</label>
                    <div className="flex items-center gap-2 text-blue-900 bg-white px-3 py-2 rounded-lg border border-blue-100">
                      <Stethoscope className="w-4 h-4 text-blue-400"/>
                      <input 
                        className="bg-transparent border-none outline-none w-full font-medium"
                        value={prescriptionMeta.doctorName}
                        onChange={(e) => setPrescriptionMeta({...prescriptionMeta, doctorName: e.target.value})}
                        placeholder="Not found"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Diagnosis / Symptoms</label>
                    <div className="flex items-center gap-2 text-blue-900 bg-white px-3 py-2 rounded-lg border border-blue-100">
                      <User className="w-4 h-4 text-blue-400"/>
                      <input 
                        className="bg-transparent border-none outline-none w-full font-medium"
                        value={prescriptionMeta.diagnosis}
                        onChange={(e) => setPrescriptionMeta({...prescriptionMeta, diagnosis: e.target.value})}
                        placeholder="Not found"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">General Advice & Notes</label>
                    <textarea 
                      className="bg-white border border-blue-100 outline-none w-full font-medium text-blue-900 px-3 py-2 rounded-lg resize-none"
                      rows={2}
                      value={prescriptionMeta.advice}
                      onChange={(e) => setPrescriptionMeta({...prescriptionMeta, advice: e.target.value})}
                      placeholder="e.g. Drink warm water, avoid cold food"
                    />
                  </div>
                  {prescriptionMeta.followUp && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Follow-up Visit</label>
                      <div className="flex items-center gap-2 text-blue-900 bg-white px-3 py-2 rounded-lg border border-blue-100 w-fit">
                        <Calendar className="w-4 h-4 text-blue-400"/>
                        <span className="font-medium">{prescriptionMeta.followUp}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Medications ({extractedDrugs.length})</h3>
              <Button size="sm" variant="outline" onClick={addDrug}><Plus className="w-4 h-4 mr-1"/> Add Drug</Button>
            </div>
            
            {extractedDrugs.map((drug, index) => (
              <div key={drug.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 relative">
                <button onClick={() => removeDrug(drug.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
                
                <div className="flex items-center justify-between mb-4 pr-10">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    {drug.rxcuiStatus === 'pending' && <span className="text-xs text-blue-500 font-medium animate-pulse">Syncing...</span>}
                    {drug.rxcuiStatus === 'success' && <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">✓ RxNorm</span>}
                    {drug.rxcuiStatus === 'failed' && <span className="text-xs text-orange-500 font-medium">Unverified</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Medication Name</label>
                    <input 
                      type="text" 
                      value={drug.medicationName}
                      onChange={(e) => updateDrug(drug.id, { medicationName: e.target.value })}
                      onBlur={() => verifyDrug(drug.id, drug.medicationName)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dosage</label>
                    <input 
                      type="text" 
                      value={drug.dosage}
                      onChange={(e) => updateDrug(drug.id, { dosage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Duration</label>
                    <input 
                      type="text" 
                      value={drug.duration}
                      placeholder="e.g. 5 days"
                      onChange={(e) => updateDrug(drug.id, { duration: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>

                {drug.interactionResult && (
                  <div className={`mb-4 p-3 rounded-lg border ${
                    drug.interactionResult.highestSeverity === 'Major' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-orange-50 border-orange-500 text-orange-800'
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4"/> {drug.interactionResult.highestSeverity} Interaction!
                    </div>
                    <p className="text-xs">Interacts with: {drug.interactionResult.interactions.map((i:any) => i.drug).join(', ')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1"><FolderPlus className="w-3 h-3"/> Folder</label>
                    <select 
                      value={drug.folder}
                      onChange={(e) => updateDrug(drug.id, { folder: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-white"
                    >
                      <option value="General">General</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Diabetes">Diabetes</option>
                      <option value="Short Term">Short Term / Antibiotics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Add Time</label>
                    <div className="flex gap-2">
                      <input 
                        type="time" 
                        value={newReminderTime[drug.id] || ''}
                        onChange={(e) => setNewReminderTime({ ...newReminderTime, [drug.id]: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm outline-none flex-1"
                      />
                      <Button size="sm" onClick={() => {
                        const time = newReminderTime[drug.id];
                        if (time && !drug.reminders.includes(time)) {
                          updateDrug(drug.id, { reminders: [...drug.reminders, time].sort() });
                          setNewReminderTime({ ...newReminderTime, [drug.id]: '' });
                        }
                      }}><Plus className="w-4 h-4" /></Button>
                    </div>
                    {drug.reminders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {drug.reminders.map((time, idx) => (
                          <span key={idx} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">
                            {time} <button onClick={() => updateDrug(drug.id, { reminders: drug.reminders.filter(t => t !== time) })}><X className="w-3 h-3 hover:text-red-500"/></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {extractedDrugs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No medications found. Click "Add Drug" to manually input.</p>
            )}

            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 font-bold" onClick={handleFinalSave} disabled={isSaving || extractedDrugs.length === 0}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirm & Save All'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'result' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-green-900 text-2xl mb-2">Successfully Saved!</h3>
              <p className="text-green-800 text-sm font-medium">Added {extractedDrugs.length} medication(s) to your medical timeline.</p>
            </div>
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <Button variant="outline" className="flex-1 font-bold" onClick={handleRetake}>Scan Another</Button>
              <Button className="flex-1 font-bold" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
