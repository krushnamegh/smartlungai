import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { AlertTriangle, CheckCircle, Info, Zap, Send, Bot, User as UserIcon, Activity, FileText, Download, Share2, Save, X, Sliders, Sun, Eye, Copy, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { chatWithRadiologist } from '../utils/geminiService';

interface ResultsDisplayProps {
  result: AnalysisResult;
  onSave?: (name: string, id: string) => void;
  isSaved?: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onSave, isSaved }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'I have analyzed the scan. You can ask me specific questions about the findings.', timestamp: new Date() }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [patientName, setPatientName] = useState(result.patientName || '');
  const [patientId, setPatientId] = useState(result.patientId || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Image Control State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [showControls, setShowControls] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
        const base64Image = result.originalUrl.split(',')[1];
        const historyForApi = chatHistory.map(m => ({ role: m.role, text: m.text }));
        
        const responseText = await chatWithRadiologist(historyForApi, userMsg.text, base64Image);
        
        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText || "I couldn't generate a response. Please try again.",
            timestamp: new Date()
        };
        setChatHistory(prev => [...prev, botMsg]);
    } catch (err) {
        console.error(err);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleExport = () => {
      const reportText = `
LUNG CANCER DETECTION SYSTEM - REPORT
Date: ${new Date().toLocaleDateString()}
Patient: ${patientName || 'Anonymous'}
Risk Level: ${result.riskLevel}
Confidence: ${(result.confidenceScore * 100).toFixed(1)}%

SUMMARY:
${result.summary}

FINDINGS:
${result.findings.map(f => `- ${f.location}: ${f.description} (${f.severity})`).join('\n')}

RADIOMIC FEATURES:
- Spiculation: ${result.detailedMetrics?.spiculation}/10
- Density: ${result.detailedMetrics?.density}/10
- Margin Definition: ${result.detailedMetrics?.marginDefinition}/10

RECOMMENDATIONS:
${result.recommendations.map(r => `- ${r}`).join('\n')}
      `;
      
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Medical_Report_${patientName.replace(/\s+/g, '_') || 'Scan'}_${Date.now()}.txt`;
      a.click();
      showToast("Report downloaded successfully");
  };

  const handleShare = async () => {
      const shareData = {
          title: `Lung Analysis: ${patientName || 'Patient'}`,
          text: `Lung Cancer Detection Report\nRisk Level: ${result.riskLevel}\nConfidence: ${(result.confidenceScore * 100).toFixed(1)}%\nSummary: ${result.summary}`,
      };

      try {
          if (navigator.share) {
              await navigator.share(shareData);
              showToast("Shared successfully");
          } else {
              await navigator.clipboard.writeText(shareData.text);
              showToast("Summary copied to clipboard");
          }
      } catch (err) {
          console.error("Share failed:", err);
          showToast("Failed to share");
      }
  };

  const handleSaveSubmit = () => {
      if(onSave && patientName && patientId) {
          onSave(patientName, patientId);
          setShowSaveModal(false);
          showToast("Patient record saved");
      }
  };

  const getRiskBadge = (level: string) => {
    const baseClasses = "flex items-center px-6 py-4 rounded-xl border w-full transition-all hover:shadow-md";
    switch (level) {
      case 'High':
        return <div className={`${baseClasses} bg-red-50 border-red-200 text-red-700`}>
          <div className="bg-red-100 p-2 rounded-lg mr-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-xl tracking-tight">HIGH RISK DETECTED</p>
            <p className="text-sm text-red-600 font-medium">Immediate medical attention recommended</p>
          </div>
        </div>;
      case 'Moderate':
        return <div className={`${baseClasses} bg-orange-50 border-orange-200 text-orange-700`}>
          <div className="bg-orange-100 p-2 rounded-lg mr-4">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <p className="font-bold text-xl tracking-tight">MODERATE RISK</p>
            <p className="text-sm text-orange-600 font-medium">Abnormalities found requiring review</p>
          </div>
        </div>;
      case 'Low':
        return <div className={`${baseClasses} bg-blue-50 border-blue-200 text-blue-700`}>
          <div className="bg-blue-100 p-2 rounded-lg mr-4">
            <Info className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-xl tracking-tight">LOW RISK</p>
            <p className="text-sm text-blue-600 font-medium">Minor or benign features detected</p>
          </div>
        </div>;
      default:
        return <div className={`${baseClasses} bg-emerald-50 border-emerald-200 text-emerald-700`}>
          <div className="bg-emerald-100 p-2 rounded-lg mr-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-xl tracking-tight">CLEAR SCAN</p>
            <p className="text-sm text-emerald-600 font-medium">No clinically significant findings</p>
          </div>
        </div>;
    }
  };

  const chartData = [
    { name: 'Nodules', value: result.nodulePercentage },
    { name: 'Healthy', value: 100 - result.nodulePercentage }
  ];
  
  const radarData = result.detailedMetrics ? [
      { subject: 'Spiculation', A: result.detailedMetrics.spiculation, fullMark: 10 },
      { subject: 'Density', A: result.detailedMetrics.density, fullMark: 10 },
      { subject: 'Margins', A: result.detailedMetrics.marginDefinition, fullMark: 10 },
      { subject: 'Calcification', A: result.detailedMetrics.calcification, fullMark: 10 },
      { subject: 'Size', A: result.detailedMetrics.sizeScore, fullMark: 10 },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Actions */}
      <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-slate-500">
             {isSaved ? <span className="flex items-center text-emerald-600 font-bold"><CheckCircle className="w-4 h-4 mr-1"/> Saved to Registry</span> : "Unsaved Analysis"}
          </div>
          <div className="flex space-x-3">
            {!isSaved && onSave && (
                <button 
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Patient
                </button>
            )}
            <button 
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" />
                Export
            </button>
            <button 
                onClick={handleShare}
                className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Share2 className="w-4 h-4 mr-2" />
                Share
            </button>
          </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Save to Patient Registry</h3>
                    <button onClick={() => setShowSaveModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
                        <input 
                            type="text" 
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID / MRN</label>
                        <input 
                            type="text" 
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. PT-123456"
                        />
                    </div>
                    <button 
                        onClick={handleSaveSubmit}
                        disabled={!patientName || !patientId}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        Save Record
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Top Section: Risk & Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Images & Visual Data */}
        <div className="lg:col-span-2 space-y-6">
          {getRiskBadge(result.riskLevel)}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                    Visual Analysis
                 </h3>
                 <div className="flex space-x-2">
                     <button 
                        onClick={() => setShowControls(!showControls)}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${showControls ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        title="Adjust Image Settings"
                     >
                         <Sliders className="w-4 h-4" />
                     </button>
                     <span className="text-xs bg-slate-100 text-slate-500 px-2 py-2 rounded font-mono">ENHANCED_CV_V3</span>
                 </div>
             </div>

             {/* Image Controls Toolbar */}
             {showControls && (
                 <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-down">
                     <div>
                         <label className="flex items-center text-xs font-bold text-slate-500 mb-2">
                             <Sun className="w-3 h-3 mr-1" /> Brightness: {brightness}%
                         </label>
                         <input 
                            type="range" min="50" max="150" value={brightness} 
                            onChange={(e) => setBrightness(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                         />
                     </div>
                     <div>
                         <label className="flex items-center text-xs font-bold text-slate-500 mb-2">
                             <Eye className="w-3 h-3 mr-1" /> Contrast: {contrast}%
                         </label>
                         <input 
                            type="range" min="50" max="150" value={contrast} 
                            onChange={(e) => setContrast(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                         />
                     </div>
                     <div>
                         <label className="flex items-center text-xs font-bold text-slate-500 mb-2">
                             <Activity className="w-3 h-3 mr-1" /> Heatmap Opacity: {(overlayOpacity * 100).toFixed(0)}%
                         </label>
                         <input 
                            type="range" min="0" max="1" step="0.1" value={overlayOpacity} 
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                         />
                     </div>
                 </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-black">
                    {/* Original Image Layer with Filters */}
                    <img 
                        src={result.originalUrl} 
                        alt="Scan" 
                        className="w-full h-72 object-cover"
                        style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                    />
                    
                    {/* Overlay Layer */}
                    <div 
                        className="absolute inset-0 transition-opacity duration-300"
                        style={{ opacity: overlayOpacity }}
                    >
                        <img 
                            src={result.overlayUrl} 
                            alt="Overlay" 
                            className="w-full h-72 object-cover mix-blend-normal" 
                        />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white font-medium text-sm">Composite Detection Layer</p>
                    </div>
                </div>

                <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-black">
                     <img 
                        src={result.heatmapUrl} 
                        alt="Heatmap" 
                        className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" 
                        style={{ filter: `contrast(${contrast * 1.2}%)` }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                         <p className="text-white font-medium text-sm">Nodule Probability Heatmap</p>
                    </div>
                </div>
             </div>
          </div>
          
          {/* Detailed Findings Report */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                 <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                 Detailed AI Report
             </h3>
             
             <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100 relative">
                <div className="absolute -left-1 top-6 bottom-6 w-1 bg-indigo-500 rounded-r"></div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                <p className="text-slate-800 leading-relaxed font-medium text-lg">
                    {result.summary}
                </p>
             </div>

             <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Clinical Findings</h4>
                {result.findings && result.findings.length > 0 ? (
                    <div className="grid gap-4">
                        {result.findings.map((finding, idx) => (
                            <div key={idx} className="flex items-start p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                                <div className={`w-3 h-3 mt-1.5 rounded-full mr-4 flex-shrink-0 ${
                                    finding.severity === 'High' ? 'bg-red-500 ring-4 ring-red-100' : 
                                    finding.severity === 'Medium' ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-blue-500 ring-4 ring-blue-100'
                                }`} />
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold text-slate-800">{finding.location}</p>
                                        <span className="text-xs font-bold text-slate-400 uppercase">{finding.severity} Severity</span>
                                    </div>
                                    <p className="text-slate-600 text-sm">{finding.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500 italic">No specific anomalies listed in this scan.</p>
                    </div>
                )}
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Recommendations</h4>
                <ul className="grid gap-3">
                    {result.recommendations && result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start text-slate-700 text-sm">
                            <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">{i+1}</span>
                            {rec}
                        </li>
                    ))}
                </ul>
             </div>
          </div>
        </div>

        {/* Right: AI Chat & Stats */}
        <div className="space-y-6">
          
          {/* Stats Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Radiomic Signature</h3>
             
             {/* Radar Chart */}
             <div className="h-64 mb-6 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name="Scan" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
             </div>

             <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">Model Confidence</span>
                        <span className="font-bold text-indigo-600">{(result.confidenceScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${result.confidenceScore * 100}%` }}></div>
                    </div>
                 </div>
                 
                 <div className="h-32">
                     <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Tissue Distribution</p>
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                             <XAxis dataKey="name" tick={{fontSize: 10}} />
                             <YAxis tick={{fontSize: 10}} />
                             <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                             />
                             <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                 {chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#94a3b8'} />
                                 ))}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                        <p className="text-xs text-slate-400">Processing Time</p>
                        <p className="font-bold text-slate-700">{result.processingTimeMs.toFixed(0)}ms</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Resolution</p>
                        <p className="font-bold text-slate-700">512x512</p>
                    </div>
                 </div>
             </div>
          </div>

          {/* AI Chat Interface */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col h-[500px] overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Dr. AI Assistant</p>
                        <p className="text-xs text-slate-400">Radiology Specialist</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75" />
                             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
                <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-2 py-1">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about this scan..."
                        className="flex-1 text-sm bg-transparent border-none px-3 py-2 focus:ring-0 outline-none placeholder:text-slate-400"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;