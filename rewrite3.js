const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const banner = '<div className="lg:col-span-3">\n              {viewingPatient && (\n                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-xl flex justify-between items-center shadow-sm">\n                  <div>\n                    <p className="font-bold">Viewing Patient Record: {viewingPatient.name || viewingPatient.displayName}</p>\n                    <p className="text-sm">({viewingPatient.email || viewingPatient.phone})</p>\n                  </div>\n                  <Button variant="outline" onClick={() => { setViewingPatient(null); setActiveTab(\'dashboard\'); }} className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 font-bold">\n                    Close Patient View\n                  </Button>\n                </div>\n              )}\n\n              <AnimatePresence mode="wait">';
code = code.replace('<div className="lg:col-span-3">\n              <AnimatePresence mode="wait">', banner);
code = code.replace('<div className="lg:col-span-3">\r\n              <AnimatePresence mode="wait">', banner);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Banner added.');
