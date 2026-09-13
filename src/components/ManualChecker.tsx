'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/features/auth/contexts/AuthContext';

export function ManualChecker() {
  const { user } = useAuth();
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!drugA || !drugB || !user) return;
    setIsChecking(true);
    setResult(null);
    
    try {
      // 1. Resolve RxNorm for Drug A
      const resA = await fetch(`/api/rxnorm?name=${encodeURIComponent(drugA)}`);
      const dataA = await resA.json();
      
      // 2. Resolve RxNorm for Drug B
      const resB = await fetch(`/api/rxnorm?name=${encodeURIComponent(drugB)}`);
      const dataB = await resB.json();

      if (!dataA.ingredient || !dataB.ingredient) {
        setResult({ error: 'Could not find one or both drugs in the official medical database.' });
        setIsChecking(false);
        return;
      }

      // 3. Check Interaction Engine
      const idToken = await user.getIdToken();
      const intRes = await fetch('/api/check-interaction', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          newDrugIngredient: dataA.ingredient,
          existingDrugIngredients: [dataB.ingredient]
        })
      });
      
      const intData = await intRes.json();
      
      setResult({
        drugA: dataA.ingredient,
        drugB: dataB.ingredient,
        originalA: drugA,
        originalB: drugB,
        highestSeverity: intData.highestSeverity,
        interactions: intData.interactions
      });

    } catch (e) {
      setResult({ error: 'Failed to connect to interaction engine.' });
    }
    
    setIsChecking(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-1 shadow-2xl overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
      
      <div className="bg-white/10 backdrop-blur-xl rounded-[1.4rem] p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-white/20 rounded-xl">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Manual Interaction Check</h2>
            <p className="text-indigo-200 text-sm font-medium">Verify two medications before prescribing or taking them.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="First medication (e.g. Aspirin)" 
              value={drugA}
              onChange={(e) => setDrugA(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-300 rounded-xl p-4 outline-none focus:bg-white/20 focus:border-white/40 transition-all font-medium text-lg"
            />
          </div>
          
          <div className="bg-white/10 p-2 rounded-full hidden md:block">
            <ArrowRight className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="bg-white/10 p-2 rounded-full md:hidden">
            <span className="text-indigo-300 font-bold">+</span>
          </div>

          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="Second medication (e.g. Warfarin)" 
              value={drugB}
              onChange={(e) => setDrugB(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-300 rounded-xl p-4 outline-none focus:bg-white/20 focus:border-white/40 transition-all font-medium text-lg"
            />
          </div>

          <Button 
            onClick={handleCheck} 
            disabled={isChecking || !drugA || !drugB}
            className="w-full md:w-auto bg-white text-indigo-900 hover:bg-gray-100 font-bold px-8 py-7 rounded-xl text-lg shadow-xl shadow-black/20"
          >
            {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Check Engine'}
          </Button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              {result.error ? (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  {result.error}
                </div>
              ) : result.highestSeverity === 'None' ? (
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-green-100 flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
                  <h3 className="text-xl font-bold">Safe Combination</h3>
                  <p className="text-green-200/80 mt-1 text-center">No known severe interactions between {result.drugA} and {result.drugB}.</p>
                </div>
              ) : (
                <div className={`border rounded-xl p-6 flex items-start gap-4 ${
                  result.highestSeverity === 'Major' ? 'bg-red-500/20 border-red-500/50 text-red-100' : 
                  'bg-orange-500/20 border-orange-500/50 text-orange-100'
                }`}>
                  <ShieldAlert className={`w-10 h-10 flex-shrink-0 ${result.highestSeverity === 'Major' ? 'text-red-400' : 'text-orange-400'}`} />
                  <div>
                    <h3 className="text-2xl font-bold mb-1 tracking-tight">
                      {result.highestSeverity} Interaction Detected
                    </h3>
                    <p className="opacity-90 font-medium">
                      Combining <strong>{result.drugA.toUpperCase()}</strong> and <strong>{result.drugB.toUpperCase()}</strong> is highly dangerous.
                    </p>
                    <div className="mt-4 p-4 bg-black/20 rounded-lg text-sm font-mono opacity-80">
                      DDInter Classification: {result.highestSeverity.toUpperCase()} RISK
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
