export interface DetectionSettings {
  threshold: number;
  preprocessingMode: 'Standard' | 'Mean-Std' | 'Min-Max';
  showDebug: boolean;
}

export interface AiFinding {
  location: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface DetailedMetrics {
  spiculation: number; // 0-10
  density: number; // 0-10
  marginDefinition: number; // 0-10
  calcification: number; // 0-10
  sizeScore: number; // 0-10
}

export interface AnalysisResult {
  id?: string; // Unique ID for saved records
  patientName?: string; // Assigned when saving
  patientId?: string;
  timestamp?: string;

  originalUrl: string;
  maskUrl: string;
  overlayUrl: string;
  heatmapUrl: string;
  
  // AI Generated Data
  nodulePercentage: number;
  riskLevel: 'High' | 'Moderate' | 'Low' | 'Clear';
  confidenceScore: number;
  findings: AiFinding[];
  summary: string;
  recommendations: string[];
  detailedMetrics: DetailedMetrics;
  
  processingTimeMs: number;
}

export interface ProcessingStats {
  accuracy: string;
  diceScore: string;
  iou: string;
  sensitivity: string;
}

export interface User {
  name: string;
  email: string;
  role: 'Radiologist' | 'Patient' | 'Researcher';
  avatar: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  lastScanDate: string;
  lastRiskLevel: string;
  scans: AnalysisResult[];
}