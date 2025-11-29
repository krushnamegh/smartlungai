import React from 'react';
import { Settings, Activity, ShieldCheck, Brain } from 'lucide-react';
import { DetectionSettings, ProcessingStats } from '../types';

interface SidebarProps {
  settings: DetectionSettings;
  setSettings: React.Dispatch<React.SetStateAction<DetectionSettings>>;
  stats: ProcessingStats;
}

const Sidebar: React.FC<SidebarProps> = ({ settings, setSettings, stats }) => {
  return (
    <aside className="w-full md:w-80 bg-slate-900 text-white flex-shrink-0 flex flex-col h-full overflow-y-auto border-r border-slate-700 shadow-2xl">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Smart Lung AI</h1>
        </div>
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">System Active</p>
            <p className="text-xs text-emerald-500/80">Hybrid CV + Logic</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Metrics Section */}
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Accuracy</p>
              <p className="text-xl font-bold text-white">{stats.accuracy}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Sensitivity</p>
              <p className="text-xl font-bold text-indigo-400">{stats.sensitivity}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Dice Score</p>
              <p className="text-xl font-bold text-purple-400">{stats.diceScore}</p>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">IoU</p>
              <p className="text-xl font-bold text-pink-400">{stats.iou}</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-700" />

        {/* Controls Section */}
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Detection Settings
          </h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Sensitivity Threshold</label>
                <span className="text-sm font-bold text-indigo-400">{settings.threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={settings.threshold}
                onChange={(e) => setSettings({ ...settings, threshold: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
              />
              <p className="text-xs text-slate-500 mt-2">
                Lower = More sensitive (may include noise). Higher = Stricter detection.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Preprocessing Mode</label>
              <select
                value={settings.preprocessingMode}
                onChange={(e) => setSettings({ ...settings, preprocessingMode: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
              >
                <option value="Standard">Standard (0-1)</option>
                <option value="Mean-Std">Mean - Std Dev</option>
                <option value="Min-Max">Min - Max Scaling</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="debug-checkbox"
                type="checkbox"
                checked={settings.showDebug}
                onChange={(e) => setSettings({ ...settings, showDebug: e.target.checked })}
                className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 rounded focus:ring-indigo-600 focus:ring-offset-slate-900"
              />
              <label htmlFor="debug-checkbox" className="ml-2 text-sm font-medium text-slate-300">Enable Debug Mode</label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Engineered for medical research
          <br />v2.1.0-RC
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;