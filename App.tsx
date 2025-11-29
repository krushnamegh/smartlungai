import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ResultsDisplay from './components/ResultsDisplay';
import { DetectionSettings, ProcessingStats, AnalysisResult, User, PatientRecord } from './types';
import { UploadCloud, FileImage, Loader2, ArrowRight, LayoutDashboard, LogOut, Users, Search, Bell, Plus, UserPlus, Trash2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { processImage } from './utils/imageProcessing';

const DEFAULT_SETTINGS: DetectionSettings = {
  threshold: 0.3,
  preprocessingMode: 'Standard',
  showDebug: false
};

const DEFAULT_STATS: ProcessingStats = {
  accuracy: "98.8%", 
  diceScore: "0.96",
  iou: "0.93",
  sensitivity: "99.2%"
};

// -- LOGIN COMPONENT --
const LoginPage = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('demo@hospital.org');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin({
        name: "Dr. Sarah Mitchell",
        email: email,
        role: "Radiologist",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
             <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">LungAI Portal</h1>
          <p className="text-slate-500">Secure Medical Imaging Access</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800">Forgot password?</a>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Dashboard"}
          </button>
        </form>
        <div className="mt-8 flex items-center justify-center space-x-2">
            <span className="text-slate-400 text-sm">New to the system?</span>
            <a href="#" className="text-indigo-600 font-bold text-sm">Request Access</a>
        </div>
      </div>
    </div>
  );
};

// -- MAIN APP --
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'analyze' | 'patients'>('dashboard');
  const [settings, setSettings] = useState<DetectionSettings>(DEFAULT_SETTINGS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Persistent History State
  const [patients, setPatients] = useState<PatientRecord[]>([
      { id: 'PT-1001', name: 'John Doe', age: 45, lastScanDate: '2024-03-10', lastRiskLevel: 'High', scans: [] },
      { id: 'PT-1002', name: 'Alice Smith', age: 32, lastScanDate: '2024-03-09', lastRiskLevel: 'Clear', scans: [] },
      { id: 'PT-1003', name: 'Robert Johnson', age: 58, lastScanDate: '2024-03-08', lastRiskLevel: 'Low', scans: [] },
      { id: 'PT-1004', name: 'Emily Davis', age: 29, lastScanDate: '2024-03-07', lastRiskLevel: 'Moderate', scans: [] },
      { id: 'PT-1005', name: 'Michael Brown', age: 62, lastScanDate: '2024-03-06', lastRiskLevel: 'Clear', scans: [] },
  ]);

  const handleLogin = (u: User) => {
    setUser(u);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setResult(null);
    setSelectedFile(null);
    setView('dashboard'); 
  };

  const startAnalysis = (file: File) => {
    setSelectedFile(file);
    setView('analyze');
    setError(null);
    setResult(null); 
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      startAnalysis(event.target.files[0]);
    }
  };

  const savePatientResult = (name: string, id: string) => {
      if (!result) return;
      
      const newPatient: PatientRecord = {
          id: id,
          name: name,
          age: 0, // Placeholder
          lastScanDate: new Date().toISOString().split('T')[0],
          lastRiskLevel: result.riskLevel,
          scans: [{ ...result, id: Date.now().toString(), patientName: name, patientId: id }]
      };

      // Check if patient exists
      const existingIdx = patients.findIndex(p => p.id === id);
      if (existingIdx >= 0) {
          const updated = [...patients];
          updated[existingIdx].lastScanDate = newPatient.lastScanDate;
          updated[existingIdx].lastRiskLevel = newPatient.lastRiskLevel;
          updated[existingIdx].scans.push(newPatient.scans[0]);
          setPatients(updated);
      } else {
          setPatients(prev => [newPatient, ...prev]);
      }
      
      // Update current result to reflect saved state
      setResult(prev => prev ? ({ ...prev, patientName: name, patientId: id }) : null);
  };

  const deletePatient = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("Are you sure you want to delete this patient record?")) {
          setPatients(prev => prev.filter(p => p.id !== id));
      }
  };

  const viewPatientDetails = (patient: PatientRecord) => {
      // If they have scans, load the latest
      if (patient.scans.length > 0) {
          setResult(patient.scans[patient.scans.length - 1]);
          setView('analyze');
      } else {
          // Dummy data fallback for demo entries that don't have full Scan objects
          alert(`Opening file history for ${patient.name}... (Demo: No full scan data)`);
      }
  };

  useEffect(() => {
    if (selectedFile && view === 'analyze' && !result && !error) {
      const runProcessing = async () => {
        setIsProcessing(true);
        try {
          // Small delay to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 500));
          const res = await processImage(selectedFile, settings);
          setResult(res);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Analysis failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      };
      runProcessing();
    }
  }, [selectedFile, view, settings.threshold, error]);

  // Handler for retry button
  const handleRetry = () => {
      if (selectedFile) {
          setResult(null);
          setError(null);
          // Effect will trigger again because error became null
      }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar 
        settings={settings} 
        setSettings={setSettings} 
        stats={DEFAULT_STATS} 
      />

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 z-20 sticky top-0">
            <div className="flex items-center space-x-6">
               <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                   <button 
                        onClick={() => setView('dashboard')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                       Dashboard
                   </button>
                   <button 
                        onClick={() => setView('patients')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'patients' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                       Patients
                   </button>
               </nav>
            </div>
            
            <div className="flex items-center space-x-4">
                <button className="p-2 text-slate-400 hover:text-indigo-600 relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex items-center space-x-3">
                    <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-200" />
                    <div className="text-sm hidden md:block">
                        <p className="font-bold text-slate-800 leading-none">{user.name}</p>
                        <p className="text-xs text-slate-500 leading-none mt-0.5">{user.role}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout} 
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>

        {/* Dashboard View */}
        {view === 'dashboard' && (
             <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white col-span-2 relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold mb-2">Welcome back, Dr. Mitchell</h1>
                            <p className="text-indigo-100 mb-6 max-w-md">
                                You have {patients.length} active patients in registry. The AI model is currently operating at 98.8% accuracy.
                            </p>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center"
                            >
                                <UploadCloud className="w-5 h-5 mr-2" />
                                Upload New Scan
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg flex flex-col justify-center items-center">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <ArrowRight className="w-8 h-8 -rotate-45" />
                        </div>
                        <h3 className="text-4xl font-bold text-slate-800">{patients.filter(p => p.lastRiskLevel !== 'Clear' && p.lastRiskLevel !== 'Low').length}</h3>
                        <p className="text-slate-500 text-sm font-medium">Critical Cases</p>
                        <p className="text-xs text-orange-500 mt-2 bg-orange-50 px-2 py-1 rounded">Action Required</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-lg font-bold text-slate-800">Recent Patient Activity</h3>
                        <button onClick={() => setView('patients')} className="text-indigo-600 text-sm font-bold hover:underline">View Full Registry</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {patients.slice(0, 6).map((patient, i) => (
                            <div key={i} onClick={() => viewPatientDetails(patient)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <FileImage className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{patient.name}</p>
                                            <p className="text-xs text-slate-500">ID: {patient.id}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                                        patient.lastRiskLevel === 'High' ? 'bg-red-50 text-red-600' : 
                                        patient.lastRiskLevel === 'Moderate' ? 'bg-orange-50 text-orange-600' :
                                        patient.lastRiskLevel === 'Low' ? 'bg-blue-50 text-blue-600' :
                                        'bg-emerald-50 text-emerald-600'
                                    }`}>
                                        {patient.lastRiskLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 relative z-10">
                                    <span>Last Scan: {patient.lastScanDate}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {/* Patients View */}
        {view === 'patients' && (
            <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in-up">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Patient Registry</h2>
                        <p className="text-slate-500 text-sm">Manage and review patient records</p>
                    </div>
                    <div className="flex space-x-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input type="text" placeholder="Search patients..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
                        </div>
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Patient
                        </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Patient Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Patient ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Last Scan</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Risk Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patients.length > 0 ? patients.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => viewPatientDetails(p)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-700">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{p.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{p.lastScanDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            p.lastRiskLevel === 'High' ? 'bg-red-100 text-red-600' :
                                            p.lastRiskLevel === 'Moderate' ? 'bg-orange-100 text-orange-600' :
                                            'bg-emerald-100 text-emerald-600'
                                        }`}>
                                            {p.lastRiskLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center space-x-4">
                                        <button className="text-indigo-600 text-sm font-medium hover:underline flex items-center">
                                            View <ArrowRight className="w-3 h-3 ml-1" />
                                        </button>
                                        <button 
                                            onClick={(e) => deletePatient(p.id, e)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Delete Patient"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No patients found in registry.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Analysis View */}
        {view === 'analyze' && (
          <div className="relative z-10 p-6 md:p-8 max-w-full mx-auto space-y-6 w-full animate-fade-in-up">
            
            {/* Context Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <UploadCloud className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">
                            {result?.patientName ? `${result.patientName} (${result.patientId})` : (selectedFile ? selectedFile.name : 'Unknown File')}
                        </p>
                        <p className="text-xs text-slate-500">
                            {result?.patientName ? 'Saved Patient Record' : 'Active Analysis Session'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <button 
                        onClick={() => { setSelectedFile(null); setResult(null); setView('dashboard'); }}
                        className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 font-medium"
                     >
                        Close
                     </button>
                     <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                     >
                         New Scan
                     </button>
                </div>
            </div>

            {/* Loading State */}
            {isProcessing && (
                 <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-xl">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mt-6">Analyzing Medical Imaging</h3>
                    <p className="text-slate-500 mt-2">Gemini 2.5 is extracting radiomic features...</p>
                 </div>
            )}

            {/* Error State */}
            {!isProcessing && !result && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Interrupted</h3>
                    <p className="text-slate-600 max-w-lg mb-8 leading-relaxed">{error}</p>
                    
                    <div className="flex space-x-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center"
                        >
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Upload Different Image
                        </button>
                        <button 
                            onClick={handleRetry}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg flex items-center"
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Retry Analysis
                        </button>
                    </div>
                </div>
            )}

            {/* Results State */}
            {!isProcessing && result && (
                <ResultsDisplay 
                    result={result} 
                    onSave={savePatientResult} 
                    isSaved={!!result.patientId} 
                />
            )}
            
          </div>
        )}

        {/* Hidden Input for Global Access */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileSelect}
        />
      </main>
    </div>
  );
};

export default App;