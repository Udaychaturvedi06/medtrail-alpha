const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// 1. Add viewingPatient state
code = code.replace(
  "  const [records, setRecords] = useState<any[]>([]);",
  "  const [records, setRecords] = useState<any[]>([]);\n  const [viewingPatient, setViewingPatient] = useState<any>(null);\n  const [caregiverPatients, setCaregiverPatients] = useState<any[]>([]);"
);

// 2. Modify useEffect to use viewingPatient.uid
code = code.replace(
  "const recordsQuery = query(collection(db, 'users', user.uid, 'records'));",
  "const targetUid = viewingPatient ? viewingPatient.uid : user.uid;\n        const recordsQuery = query(collection(db, 'users', targetUid, 'records'));"
);

// 3. Ensure the dependency array includes viewingPatient
code = code.replace(
  "}, [user, role]);",
  "}, [user, role, viewingPatient]);"
);

// 4. Update Caregiver Tab Logic
const oldCaregiverTab = "{/* Caregiver Patients Tab */}\r\n                {activeTab === 'patients' && (\r\n                  <div className=\"bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto text-center py-20\">\r\n                    <HeartPulse className=\"w-16 h-16 text-red-500 mx-auto mb-4\" />\r\n                    <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">My Patients</h2>\r\n                    <p className=\"text-gray-500\">You are monitoring 0 active patients. Patients must add your email to their Emergency Contacts in settings.</p>\r\n                  </div>\r\n                )}";
const oldCaregiverTab2 = "{/* Caregiver Patients Tab */}\n                {activeTab === 'patients' && (\n                  <div className=\"bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto text-center py-20\">\n                    <HeartPulse className=\"w-16 h-16 text-red-500 mx-auto mb-4\" />\n                    <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">My Patients</h2>\n                    <p className=\"text-gray-500\">You are monitoring 0 active patients. Patients must add your email to their Emergency Contacts in settings.</p>\n                  </div>\n                )}";

const newCaregiverTab = \{/* Caregiver Patients Tab */}
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
                            <div>
                              <p className="font-bold text-lg text-gray-800">{p.name || p.displayName || 'Unknown Patient'}</p>
                              <p className="text-sm text-gray-500">{p.email}</p>
                            </div>
                            <Button onClick={() => { setViewingPatient(p); setActiveTab('dashboard'); }} className="bg-primary hover:bg-blue-700">View Timeline</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}\;

code = code.replace(oldCaregiverTab, newCaregiverTab).replace(oldCaregiverTab2, newCaregiverTab);

// 5. Update Doctor Search Tab Logic
code = code.replace(
  "// Search functionality goes here\n                        toast.info(Searching for: \);",
  \// Search functionality goes here
                        const searchFirebase = async () => {
                          const loadingToast = toast.loading('Searching patient directory...');
                          try {
                            const { db } = await import('@/lib/firebase');
                            const { collection, query, where, getDocs } = await import('firebase/firestore');
                            if (!db) return;
                            
                            // Try email search first
                            let q = query(collection(db, 'users'), where('email', '==', queryInput));
                            let snap = await getDocs(q);
                            
                            if (snap.empty) {
                              // Fallback to phone search
                              q = query(collection(db, 'users'), where('phone', '==', queryInput));
                              snap = await getDocs(q);
                            }
                            
                            if (!snap.empty) {
                              const foundDoc = snap.docs[0];
                              setViewingPatient({ uid: foundDoc.id, ...foundDoc.data() });
                              setActiveTab('dashboard');
                              toast.success('Patient found! Loading timeline...', { id: loadingToast });
                            } else {
                              toast.error('Patient not found. Please verify the email or phone number.', { id: loadingToast });
                            }
                          } catch (e) {
                            console.error(e);
                            toast.error('Search failed.', { id: loadingToast });
                          }
                        };
                        const queryInput = query;
                        searchFirebase();\
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Done rewrites.');
