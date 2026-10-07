const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const caregiverRegex = /\{\/\* Caregiver Patients Tab \*\/\}[\s\S]*?\{\/\* Settings Tab \*\/\}/;
const newCaregiverStr = `{/* Caregiver Patients Tab */}
                {activeTab === 'patients' && (
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto py-10">
                    <div className="flex items-center gap-3 mb-6 justify-center">
                      <HeartPulse className="w-10 h-10 text-red-500" />
                      <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
                    </div>
                    {caregiverPatients.length === 0 ? (
                      <div className="text-center">
                        <p className="text-gray-500">You are monitoring 0 active patients. Patients must add your email to their Emergency Contacts in settings.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {caregiverPatients.map(p => (
                          <div key={p.uid} className="flex justify-between items-center p-4 border rounded-xl hover:bg-gray-50 transition">
                            <div className="text-left">
                              <p className="font-bold text-lg text-gray-800">{p.name || p.displayName || 'Unknown Patient'}</p>
                              <p className="text-sm text-gray-500">{p.email}</p>
                            </div>
                            <Button onClick={() => { setViewingPatient(p); setActiveTab('dashboard'); }} className="bg-primary hover:bg-blue-700">View Timeline</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Settings Tab */}`;

code = code.replace(caregiverRegex, newCaregiverStr);

const doctorRegex = /\{\/\* Doctor Search Tab \*\/\}[\s\S]*?<\/AnimatePresence>/;
const newDoctorStr = `{/* Doctor Search Tab */}
                {activeTab === 'search' && (
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto text-center py-20">
                    <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Directory Search</h2>
                    <p className="text-gray-500 mb-6">Search for patients by email or phone to view their clinical timeline.</p>
                    <form 
                      className="flex max-w-md mx-auto gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.target.elements.namedItem('searchQuery');
                        const queryVal = input.value.trim();
                        if (queryVal.length < 3) return toast.error('Query must be at least 3 chars');
                        
                        const searchFirebase = async () => {
                          const loadingToast = toast.loading('Searching directory...');
                          try {
                            const { db } = await import('@/lib/firebase');
                            const { collection, query, where, getDocs } = await import('firebase/firestore');
                            if (!db) return;
                            let q = query(collection(db, 'users'), where('email', '==', queryVal));
                            let snap = await getDocs(q);
                            if (snap.empty) {
                              q = query(collection(db, 'users'), where('phone', '==', queryVal));
                              snap = await getDocs(q);
                            }
                            if (!snap.empty) {
                              const foundDoc = snap.docs[0];
                              setViewingPatient({ uid: foundDoc.id, ...foundDoc.data() });
                              setActiveTab('dashboard');
                              toast.success('Patient found!', { id: loadingToast });
                            } else {
                              toast.error('Patient not found.', { id: loadingToast });
                            }
                          } catch(err) {
                            toast.error('Search failed', { id: loadingToast });
                          }
                        };
                        searchFirebase();
                      }}
                    >
                      <input name="searchQuery" type="text" placeholder="Patient Email or Phone" className="flex-1 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary" />
                      <Button type="submit" className="px-6 font-bold">Search</Button>
                    </form>
                  </div>
                )}
              </AnimatePresence>`;

code = code.replace(doctorRegex, newDoctorStr);

// Add the banner
const bannerStr = `<div className="lg:col-span-3">
              {viewingPatient && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold">Viewing Patient Record: {viewingPatient.name || viewingPatient.displayName}</p>
                    <p className="text-sm">({viewingPatient.email || viewingPatient.phone})</p>
                  </div>
                  <Button variant="outline" onClick={() => { setViewingPatient(null); setActiveTab('dashboard'); }} className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 font-bold">
                    Close Patient View
                  </Button>
                </div>
              )}
              <AnimatePresence mode="wait">`;

code = code.replace(/<div className="lg:col-span-3">\s*<AnimatePresence mode="wait">/g, bannerStr);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('done tab updates');
