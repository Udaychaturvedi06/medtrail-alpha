import { useState, useEffect } from 'react';
import { signInWithPopup, OAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, ShieldCheck, HeartPulse, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MISCONCEPTIONS = [
  { text: "Antibiotics cure the common cold and flu.", truth: "Antibiotics only treat bacterial infections, not viruses." },
  { text: "Cracking your knuckles causes arthritis.", truth: "There is no scientific evidence linking knuckle cracking to arthritis." },
  { text: "You should starve a fever and feed a cold.", truth: "Staying nourished and hydrated is critical for fighting any illness." },
  { text: "We only use 10% of our brains.", truth: "Brain imaging shows we use almost all of it, even while sleeping." },
  { text: "Sugar causes hyperactivity in children.", truth: "Numerous clinical trials have completely debunked this myth." },
  { text: "Waking a sleepwalker is dangerous.", truth: "It's actually more dangerous not to wake them, as they could hurt themselves." },
];

export function LoginScreen() {
  const [loading, setLoading] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * MISCONCEPTIONS.length));
    setMounted(true);
  }, []);

  const quote = MISCONCEPTIONS[quoteIndex];

  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info('Sign-in cancelled.');
      } else {
        toast.error(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setLoading('apple');
    try {
      const appleProvider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, appleProvider);
      toast.success('Successfully signed in!');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info('Sign-in cancelled.');
      } else {
        toast.error(err.message || 'Failed to sign in with Apple');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-white">
      
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Absolute Premium Background Blob for Right Side */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

        {/* Left Side - Brand & Random Quote */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden md:flex w-1/2 bg-gradient-to-br from-[#0f5c53] via-[#117b6f] to-[#0b544b] flex-col justify-between p-12 text-white relative overflow-hidden shadow-2xl z-10"
        >
          {/* Continuous Abstract Medical Symbols Strip overlay on left side only */}
          <div className="absolute top-0 left-0 right-0 w-full text-white/20 py-2 overflow-hidden flex whitespace-nowrap text-[10px] font-mono tracking-[0.5em] select-none pointer-events-none">
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
              className="flex gap-4"
            >
              {[...Array(30)].map((_, i) => (
                <span key={i}>[Rx_SCAN: SAFE] —— v^v^v —— [DDInter: CLEAR] —— &lt;HIPAA_ENC: 256&gt; —— [SYS: ON] —— v^v^v ——</span>
              ))}
            </motion.div>
          </div>

          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
          
          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <HeartPulse className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight">MedTrail</h1>
          </div>

          <div className="relative z-10 space-y-12 max-w-lg min-h-[200px]">
            
            {/* The Random Quote Block */}
            <div className="relative">
              <Quote className="absolute -top-8 -left-8 w-16 h-16 text-white/10 rotate-180" />
              {mounted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-3xl font-medium leading-relaxed mb-6 drop-shadow-md text-white/95">
                    "{quote.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md font-extrabold border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                      ?
                    </div>
                    <div>
                      <div className="font-extrabold text-white tracking-wider uppercase text-xs mb-1 opacity-80">Medical Fact</div>
                      <div className="text-sm text-white font-medium leading-snug">{quote.truth}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="space-y-4 pt-8 border-t border-white/10"
            >
              {/* Premium OS-Style Widgets */}
              <div className="flex items-center gap-5 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl hover:bg-black/30 transition-all cursor-default">
                <div className="bg-white/10 p-3 rounded-xl shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white tracking-wide text-sm">HIPAA & DPDP Secured</h4>
                  <p className="text-xs text-white/70 font-medium mt-0.5">Military-grade end-to-end data encryption.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-5 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl hover:bg-black/30 transition-all cursor-default">
                <div className="bg-white/10 p-3 rounded-xl shadow-inner">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white tracking-wide text-sm">AI Interaction Engine</h4>
                  <p className="text-xs text-white/70 font-medium mt-0.5">Real-time alerts for dangerous drug mixing.</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="relative z-10 text-sm opacity-60 font-medium">
            © 2026 MedTrail Healthcare System
          </div>
        </motion.div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-transparent z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md space-y-8"
        >
          
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-center gap-2 text-primary mb-8">
            <HeartPulse className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold tracking-tight">MedTrail</h1>
          </div>

          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-blue-400 z-10" />
            <CardHeader className="space-y-3 pb-8 pt-12 px-10 text-center">
              <CardTitle className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome</CardTitle>
              <CardDescription className="text-base font-medium text-gray-500">
                Sign in to access your secure portal
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-10 pb-10 space-y-5">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-14 text-base font-semibold transition-all hover:bg-gray-50 border-gray-200 rounded-xl shadow-sm hover:shadow-md" 
                  onClick={handleGoogleLogin}
                  disabled={loading !== null}
                >
                  {loading === 'google' ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-14 text-base font-semibold transition-all hover:bg-gray-50 border-gray-200 rounded-xl shadow-sm hover:shadow-md" 
                  onClick={handleAppleLogin}
                  disabled={loading !== null}
                >
                  {loading === 'apple' ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.65-.73 1.5.15 2.65.74 3.37 1.84-2.9 1.74-2.4 5.7.53 6.84-1.2 3.12-2.58 4.26-2.63 4.22zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.41-3.74 4.25z"/>
                      </svg>
                      Sign in with Apple
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
          
          <div className="text-sm text-center text-gray-400 px-8 leading-relaxed font-medium">
            By signing in, you agree to our <a href="#" className="text-gray-600 underline underline-offset-4 hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="text-gray-600 underline underline-offset-4 hover:text-primary transition-colors">Privacy Policy</a>.
          </div>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
