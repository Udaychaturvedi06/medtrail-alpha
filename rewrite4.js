const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const regexCaregiver = /\{\/\* Caregiver Patients Tab \*\/\}[\s\S]*?You are monitoring 0 active patients.*?<\/div>\s*\)\}/;

const newCaregiver = \{/* Caregiver Patients Tab */}
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
                )};

code = code.replace(regexCaregiver, newCaregiver);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Caregiver updated.');
