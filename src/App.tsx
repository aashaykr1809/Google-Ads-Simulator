import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings2, 
  PlayCircle, 
  BarChart3, 
  Upload, 
  Zap, 
  Info, 
  ChevronRight, 
  Download, 
  Plus, 
  Trash2,
  Table as TableIcon,
  TrendingUp,
  History,
  FileText,
  Calculator,
  BookOpen,
  Target,
  Globe,
  Cpu,
  Monitor,
  Smartphone,
  Search,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { CampaignSettings, SimulationResult, TERMINOLOGY } from './types';
import { runSimulation } from './simulationEngine';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'keyword-research' | 'simulation' | 'results' | 'import' | 'optimize' | 'learning'>('dashboard');
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [currentSettings, setCurrentSettings] = useState<CampaignSettings>({
    name: 'New Campaign',
    budget: 100,
    bidStrategy: 'maximize_conversions',
    keywords: [
      { text: 'google ads', matchType: 'phrase', volume: 5000, avgCpc: 2.5, difficulty: 45 },
      { text: 'marketing', matchType: 'broad', volume: 15000, avgCpc: 1.8, difficulty: 60 }
    ],
    headlines: ['Best Marketing Tool 2024', 'Boost Your Business'],
    descriptions: ['Boost your business with our AI-powered marketing solutions. Start your free trial today!'],
    finalUrl: 'https://www.example.com',
    targetAudience: 'Small Business Owners',
    ageRange: ['25-34', '35-44'],
    gender: ['Male', 'Female'],
    interests: ['Business Services', 'Advertising & Marketing'],
    demographics: ['Business Professionals', 'Decision Makers'],
    location: 'United States',
    industry: 'B2B SaaS',
    companySize: 'Mid-market',
    device: 'All Devices',
    duration: 14
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [importedData, setImportedData] = useState<any[]>([]);
  const [testVariation, setTestVariation] = useState<CampaignSettings | null>(null);
  const [abTestResults, setAbTestResults] = useState<{ original: SimulationResult, variation: SimulationResult } | null>(null);
  const [isAbTesting, setIsAbTesting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('adlab_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('adlab_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const calculateAdStrength = (settings: CampaignSettings) => {
    let score = 0;
    const headlines = settings.headlines.filter(h => h.trim().length > 0);
    const descriptions = settings.descriptions.filter(d => d.trim().length > 0);
    
    // Headline quantity
    if (headlines.length >= 10) score += 40;
    else if (headlines.length >= 5) score += 25;
    else if (headlines.length >= 3) score += 15;
    
    // Description quantity
    if (descriptions.length >= 4) score += 30;
    else if (descriptions.length >= 2) score += 15;
    
    // Quality check (length)
    const longHeadlines = headlines.filter(h => h.length > 20).length;
    if (longHeadlines >= 3) score += 15;
    
    const longDescriptions = descriptions.filter(d => d.length > 60).length;
    if (longDescriptions >= 2) score += 15;
    
    if (score >= 80) return { label: 'Excellent', color: 'bg-emerald-500', score };
    if (score >= 60) return { label: 'Good', color: 'bg-blue-500', score };
    if (score >= 40) return { label: 'Average', color: 'bg-amber-500', score };
    return { label: 'Poor', color: 'bg-red-500', score };
  };

  const campaignChanges = React.useMemo(() => {
    if (history.length < 2 || !lastResult) return null;
    
    const currentIndex = history.findIndex(h => h.id === lastResult.id);
    if (currentIndex === -1 || currentIndex === history.length - 1) return null;
    
    const prev = history[currentIndex + 1].campaignSettings;
    const curr = lastResult.campaignSettings;
    
    const changes: { setting: string; prev: any; curr: any; type: 'increase' | 'decrease' | 'modified' | 'none' }[] = [];

    const compareSimple = (key: keyof CampaignSettings, label: string) => {
      if (prev[key] !== curr[key]) {
        let type: 'increase' | 'decrease' | 'modified' = 'modified';
        if (typeof prev[key] === 'number' && typeof curr[key] === 'number') {
          type = (curr[key] as number) > (prev[key] as number) ? 'increase' : 'decrease';
        }
        changes.push({ setting: label, prev: prev[key], curr: curr[key], type });
      }
    };

    compareSimple('budget', 'Daily Budget');
    compareSimple('bidStrategy', 'Bid Strategy');
    compareSimple('industry', 'Industry');
    compareSimple('companySize', 'Company Size');
    compareSimple('device', 'Device');
    compareSimple('location', 'Location');
    compareSimple('duration', 'Duration');

    if (JSON.stringify(prev.keywords) !== JSON.stringify(curr.keywords)) {
      changes.push({ 
        setting: 'Keywords', 
        prev: `${prev.keywords.length} keywords`, 
        curr: `${curr.keywords.length} keywords`, 
        type: curr.keywords.length > prev.keywords.length ? 'increase' : (curr.keywords.length < prev.keywords.length ? 'decrease' : 'modified') 
      });
    }

    if (JSON.stringify(prev.headlines) !== JSON.stringify(curr.headlines)) {
      changes.push({ setting: 'Headlines', prev: `${prev.headlines.length} headlines`, curr: `${curr.headlines.length} headlines`, type: 'modified' });
    }
    if (JSON.stringify(prev.descriptions) !== JSON.stringify(curr.descriptions)) {
      changes.push({ setting: 'Descriptions', prev: `${prev.descriptions.length} descriptions`, curr: `${curr.descriptions.length} descriptions`, type: 'modified' });
    }

    if (JSON.stringify(prev.ageRange) !== JSON.stringify(curr.ageRange)) {
      changes.push({ setting: 'Age Range', prev: prev.ageRange.join(', '), curr: curr.ageRange.join(', '), type: 'modified' });
    }
    if (JSON.stringify(prev.gender) !== JSON.stringify(curr.gender)) {
      changes.push({ setting: 'Gender', prev: prev.gender.join(', '), curr: curr.gender.join(', '), type: 'modified' });
    }
    if (JSON.stringify(prev.interests) !== JSON.stringify(curr.interests)) {
      changes.push({ setting: 'Interests', prev: prev.interests.join(', '), curr: curr.interests.join(', '), type: 'modified' });
    }

    const metricsBetter = lastResult.metrics.roas > history[currentIndex + 1].metrics.roas || 
                         lastResult.metrics.conversions > history[currentIndex + 1].metrics.conversions;
    const metricsWorse = lastResult.metrics.roas < history[currentIndex + 1].metrics.roas || 
                        lastResult.metrics.conversions < history[currentIndex + 1].metrics.conversions;

    return { 
      changes, 
      prevName: history[currentIndex + 1].campaignSettings.name,
      impact: metricsBetter ? 'better' : (metricsWorse ? 'worse' : 'neutral')
    };
  }, [history, lastResult]);

  // Keyword Research State
  const [keywordSeed, setKeywordSeed] = useState('');
  const [isSearchingKeywords, setIsSearchingKeywords] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<{ top: any[], lowHanging: any[] }>({ top: [], lowHanging: [] });

  const fetchKeywordIdeas = async () => {
    if (!keywordSeed) return;
    setIsSearchingKeywords(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as Google Keyword Planner. Provide keyword ideas for the seed topic: "${keywordSeed}". 
        
        Return a JSON object with two arrays:
        1. "top": 10 keywords with the highest monthly search volume.
        2. "lowHanging": 10 keywords with low competition (difficulty < 40) and lower CPCs.
        
        For each keyword, provide an object with EXACTLY these keys: "text" (string), "volume" (number), "avgCpc" (number), and "difficulty" (number).
        Return ONLY a JSON object with keys: top, lowHanging.`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              top: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    volume: { type: Type.NUMBER },
                    avgCpc: { type: Type.NUMBER },
                    difficulty: { type: Type.NUMBER }
                  },
                  required: ["text", "volume", "avgCpc", "difficulty"]
                }
              },
              lowHanging: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    volume: { type: Type.NUMBER },
                    avgCpc: { type: Type.NUMBER },
                    difficulty: { type: Type.NUMBER }
                  },
                  required: ["text", "volume", "avgCpc", "difficulty"]
                }
              }
            },
            required: ["top", "lowHanging"]
          }
        }
      });
      const data = JSON.parse(response.text || '{"top": [], "lowHanging": []}');
      setKeywordSuggestions(data);
    } catch (error) {
      console.error("Keyword research failed:", error);
    } finally {
      setIsSearchingKeywords(false);
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('adlab_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adlab_history', JSON.stringify(history));
  }, [history]);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimLogs([]);
    setActiveTab('simulation');

    let currentLogIndex = 0;
    const result = runSimulation(currentSettings);
    
    const interval = setInterval(() => {
      if (currentLogIndex < result.logs.length) {
        setSimLogs(prev => [...prev, result.logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setLastResult(result);
          setHistory(prev => [result, ...prev]);
          setIsSimulating(false);
          setActiveTab('results');
          generateAiInsights(result);
        }, 1000);
      }
    }, 600);
  };

  const generateAiInsights = async (result: SimulationResult) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these Google Ads simulation results and provide structured actionable optimization tips.
        Campaign: ${result.campaignSettings.name}
        Metrics: CTR: ${(result.metrics.ctr * 100).toFixed(2)}%, CPC: $${result.metrics.cpc.toFixed(2)}, Conversions: ${result.metrics.conversions}, ROAS: ${result.metrics.roas.toFixed(2)}.
        Budget: $${result.campaignSettings.budget}.
        
        Return ONLY a JSON object with this structure:
        {
          "analysis": "Brief overall performance analysis",
          "tips": [
            { "title": "Tip Title", "problem": "What is lacking", "solution": "How to improve", "expectedResult": "Potential impact" }
          ]
        }`,
        config: { responseMimeType: "application/json" }
      });
      setAiInsights(response.text || '');
    } catch (error) {
      console.error("AI Insights failed:", error);
      setAiInsights(JSON.stringify({
        analysis: "AI analysis currently unavailable.",
        tips: [{ title: "Focus on CTR", problem: "Low engagement", solution: "Test more headlines", expectedResult: "Higher click volume" }]
      }));
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setImportedData(results.data);
          setActiveTab('import');
        }
      });
    }
  };

  const handleRunABTest = () => {
    if (!testVariation) return;
    setIsAbTesting(true);
    
    // Simulate both
    const originalResult = runSimulation(currentSettings);
    const variationResult = runSimulation(testVariation);
    
    setTimeout(() => {
      setAbTestResults({ original: originalResult, variation: variationResult });
      setIsAbTesting(false);
    }, 1500);
  };

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300", darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      <aside className={cn("fixed left-0 top-0 h-full w-64 border-r z-30 hidden lg:flex flex-col transition-colors duration-300", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
        <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-800" : "border-slate-100")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Zap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AdLab Pro</h1>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={cn("p-2 rounded-lg transition-colors", darkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavButton active={activeTab === 'keyword-research'} onClick={() => setActiveTab('keyword-research')} icon={<Search size={20} />} label="Keyword Research" />
          <NavButton active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} icon={<Settings2 size={20} />} label="Campaign Setup" />
          <NavButton active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} icon={<PlayCircle size={20} />} label="Run Simulation" />
          <NavButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<BarChart3 size={20} />} label="Results & Analysis" />
          <NavButton active={activeTab === 'import'} onClick={() => setActiveTab('import')} icon={<Upload size={20} />} label="Import Data" />
          <NavButton active={activeTab === 'optimize'} onClick={() => setActiveTab('optimize')} icon={<TrendingUp size={20} />} label="Optimize (A/B)" />
          <NavButton active={activeTab === 'learning'} onClick={() => setActiveTab('learning')} icon={<BookOpen size={20} />} label="Learning Center" />
        </nav>

        <div className={cn("p-4 border-t", darkMode ? "border-slate-800" : "border-slate-100")}>
          <div className={cn("rounded-lg p-4", darkMode ? "bg-blue-900/20" : "bg-blue-50")}>
            <h3 className={cn("text-sm font-semibold mb-1", darkMode ? "text-blue-300" : "text-blue-900")}>Learning Mode</h3>
            <p className={cn("text-xs", darkMode ? "text-blue-400" : "text-blue-700")}>Hover over info icons to learn about Google Ads terminology.</p>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 p-8 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h2 className={cn("text-3xl font-bold capitalize", darkMode ? "text-white" : "text-slate-900")}>{activeTab.replace('-', ' ')}</h2>
            <p className={cn("text-sm mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>Manage and simulate your Google Ads performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("px-4 py-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-slate-400" : "text-slate-500")}>Simulation Engine Active</span>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn("lg:hidden p-2 rounded-xl border transition-colors", darkMode ? "bg-slate-900 border-slate-800 text-amber-400" : "bg-white border-slate-200 text-slate-600")}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => exportToExcel(history.map(h => ({ ...h.metrics, ...h.campaignSettings })), 'adlab_history')}
              className={cn("flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium", darkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")}
            >
              <Download size={16} /> Export History
            </button>
            <button 
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className={cn("flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 font-medium", darkMode ? "shadow-blue-900/20" : "shadow-blue-200")}
            >
              <PlayCircle size={18} /> Run Simulation
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Spend" value={`$${history.reduce((acc, curr) => acc + curr.metrics.cost, 0).toFixed(2)}`} icon={<TrendingUp className="text-blue-600" />} trend="+12%" />
                <StatCard title="Avg. ROAS" value={`${(history.reduce((acc, curr) => acc + curr.metrics.roas, 0) / (history.length || 1)).toFixed(2)}x`} icon={<Zap className="text-amber-500" />} trend="+5.4%" />
                <StatCard title="Total Conversions" value={history.reduce((acc, curr) => acc + curr.metrics.conversions, 0).toString()} icon={<BarChart3 className="text-emerald-600" />} trend="+18%" />
                <StatCard title="Avg. CTR" value={`${((history.reduce((acc, curr) => acc + curr.metrics.ctr, 0) / (history.length || 1)) * 100).toFixed(2)}%`} icon={<LayoutDashboard className="text-purple-600" />} trend="-2.1%" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Performance History</h3>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...history].reverse()}>
                          <defs>
                            <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                          <XAxis dataKey="timestamp" hide />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                              color: darkMode ? '#f8fafc' : '#0f172a'
                            }} 
                            itemStyle={{ color: darkMode ? '#3b82f6' : '#2563eb' }}
                          />
                          <Area type="monotone" dataKey="metrics.conversions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorConv)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Info size={18} className="text-blue-600" /> Glossary
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      {Object.values(TERMINOLOGY).map((term: any, i) => (
                        <div key={i} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                          <h4 className={cn("text-sm font-bold", darkMode ? "text-slate-200" : "text-slate-800")}>{term.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{term.definition}</p>
                          {term.formula && <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-1">Formula: {term.formula}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold">Recent Simulations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className={cn("text-xs uppercase tracking-wider", darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500")}>
                      <tr>
                        <th className="px-6 py-4 font-semibold">Campaign</th>
                        <th className="px-6 py-4 font-semibold">Budget</th>
                        <th className="px-6 py-4 font-semibold">Clicks</th>
                        <th className="px-6 py-4 font-semibold">Conversions</th>
                        <th className="px-6 py-4 font-semibold">ROAS</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", darkMode ? "divide-slate-800" : "divide-slate-100")}>
                      {history.slice(0, 5).map((run) => (
                        <tr key={run.id} className={cn("transition-colors", darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                          <td className="px-6 py-4 font-medium">{run.campaignSettings.name}</td>
                          <td className="px-6 py-4">${run.campaignSettings.budget}</td>
                          <td className="px-6 py-4">{run.metrics.clicks}</td>
                          <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{run.metrics.conversions}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-1 rounded-full text-xs font-bold", run.metrics.roas > 2 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400")}>
                              {run.metrics.roas.toFixed(2)}x
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{new Date(run.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keyword-research' && (
            <motion.div key="keyword-research" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h2 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Keyword Research Tool</h2>
                    <p className={cn("", darkMode ? "text-slate-400" : "text-slate-500")}>Discover high-performing keywords for your campaign using AI.</p>
                  </div>
                  <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={keywordSeed} 
                        onChange={(e) => setKeywordSeed(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchKeywordIdeas()}
                        placeholder="Enter a topic or product..."
                        className={cn("w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                      />
                    </div>
                    <button 
                      onClick={fetchKeywordIdeas}
                      disabled={isSearchingKeywords}
                      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSearchingKeywords ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          Get Ideas
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {keywordSuggestions.top.length > 0 || keywordSuggestions.lowHanging.length > 0 ? (
                  <div className="space-y-12">
                    {/* Top Keywords Section */}
                    {keywordSuggestions.top.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-blue-600" size={20} />
                          <h3 className={cn("text-lg font-bold", darkMode ? "text-white" : "text-slate-900")}>Top Search Volume Keywords</h3>
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">High Reach</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left">
                            <thead className={cn("border-b text-xs uppercase tracking-wider", darkMode ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")}>
                              <tr>
                                <th className="px-6 py-4 font-semibold">Keyword</th>
                                <th className="px-6 py-4 font-semibold">Avg. Monthly Searches</th>
                                <th className="px-6 py-4 font-semibold">Avg. CPC</th>
                                <th className="px-6 py-4 font-semibold">Competition</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className={cn("divide-y", darkMode ? "divide-slate-700" : "divide-slate-200")}>
                              {keywordSuggestions.top.map((kw, i) => {
                                const isAdded = currentSettings.keywords.some(k => k.text.toLowerCase() === kw.text.toLowerCase());
                                return (
                                  <tr key={i} className={cn("transition-colors group", darkMode ? "hover:bg-slate-900/50" : "hover:bg-white")}>
                                    <td className="px-6 py-4">
                                      <div className={cn("font-medium", darkMode ? "text-slate-200" : "text-slate-900")}>{kw.text}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{kw.volume?.toLocaleString() || '0'}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">${kw.avgCpc?.toFixed(2) || '0.00'}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <div 
                                            className={cn(
                                              "h-full rounded-full",
                                              kw.difficulty > 70 ? "bg-red-500" : kw.difficulty > 40 ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${kw.difficulty}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kw.difficulty}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => {
                                          if (isAdded) {
                                            setCurrentSettings({...currentSettings, keywords: currentSettings.keywords.filter(k => k.text.toLowerCase() !== kw.text.toLowerCase())});
                                          } else {
                                            setCurrentSettings({...currentSettings, keywords: [...currentSettings.keywords, { ...kw, matchType: 'phrase' }]});
                                          }
                                        }}
                                        className={cn(
                                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto",
                                          isAdded ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        )}
                                      >
                                        {isAdded ? <><Zap size={14} /> Added</> : <><Plus size={14} /> Add</>}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Low-Hanging Fruit Section */}
                    {keywordSuggestions.lowHanging.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Zap className="text-amber-500" size={20} />
                          <h3 className={cn("text-lg font-bold", darkMode ? "text-white" : "text-slate-900")}>Suggested Low-Hanging Fruit</h3>
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded uppercase">High Efficiency</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left">
                            <thead className={cn("border-b text-xs uppercase tracking-wider", darkMode ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")}>
                              <tr>
                                <th className="px-6 py-4 font-semibold">Keyword</th>
                                <th className="px-6 py-4 font-semibold">Avg. Monthly Searches</th>
                                <th className="px-6 py-4 font-semibold">Avg. CPC</th>
                                <th className="px-6 py-4 font-semibold">Competition</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className={cn("divide-y", darkMode ? "divide-slate-700" : "divide-slate-200")}>
                              {keywordSuggestions.lowHanging.map((kw, i) => {
                                const isAdded = currentSettings.keywords.some(k => k.text.toLowerCase() === kw.text.toLowerCase());
                                return (
                                  <tr key={i} className={cn("transition-colors group", darkMode ? "hover:bg-slate-900/50" : "hover:bg-white")}>
                                    <td className="px-6 py-4">
                                      <div className={cn("font-medium", darkMode ? "text-slate-200" : "text-slate-900")}>{kw.text}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{kw.volume?.toLocaleString() || '0'}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">${kw.avgCpc?.toFixed(2) || '0.00'}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <div 
                                            className={cn(
                                              "h-full rounded-full",
                                              kw.difficulty > 70 ? "bg-red-500" : kw.difficulty > 40 ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${kw.difficulty}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kw.difficulty}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => {
                                          if (isAdded) {
                                            setCurrentSettings({...currentSettings, keywords: currentSettings.keywords.filter(k => k.text.toLowerCase() !== kw.text.toLowerCase())});
                                          } else {
                                            setCurrentSettings({...currentSettings, keywords: [...currentSettings.keywords, { ...kw, matchType: 'phrase' }]});
                                          }
                                        }}
                                        className={cn(
                                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto",
                                          isAdded ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        )}
                                      >
                                        {isAdded ? <><Zap size={14} /> Added</> : <><Plus size={14} /> Add</>}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Search className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Start your research</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Enter a topic above to generate 20 high-potential keywords for your campaign.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Campaign Basics */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Settings2 className="text-blue-600" /> Campaign Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={cn("block text-sm font-semibold mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Campaign Name</label>
                      <input type="text" value={currentSettings.name} onChange={(e) => setCurrentSettings({...currentSettings, name: e.target.value})} className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={cn("block text-sm font-semibold mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Daily Budget ($)</label>
                        <input type="number" value={currentSettings.budget} onChange={(e) => setCurrentSettings({...currentSettings, budget: Number(e.target.value)})} className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} />
                      </div>
                      <div>
                        <label className={cn("block text-sm font-semibold mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Bid Strategy</label>
                        <select value={currentSettings.bidStrategy} onChange={(e) => setCurrentSettings({...currentSettings, bidStrategy: e.target.value as any})} className={cn("w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")}>
                          <option value="manual_cpc">Manual CPC</option>
                          <option value="maximize_conversions">Maximize Conversions</option>
                          <option value="target_roas">Target ROAS</option>
                          <option value="target_cpa">Target CPA</option>
                          <option value="maximize_clicks">Maximize Clicks</option>
                        </select>
                        <p className={cn("mt-2 text-[10px] italic leading-tight", darkMode ? "text-slate-400" : "text-slate-500")}>
                          {TERMINOLOGY.bidStrategy.options[currentSettings.bidStrategy]}
                        </p>
                        {currentSettings.bidStrategy === 'manual_cpc' && (
                          <div className={cn("mt-4 p-3 rounded-lg border space-y-2", darkMode ? "bg-blue-900/20 border-blue-900/30" : "bg-blue-50 border-blue-100")}>
                            <label className={cn("block text-xs font-bold uppercase", darkMode ? "text-blue-400" : "text-blue-800")}>Max CPC Limit ($)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={currentSettings.maxCpc || 2.00} 
                              onChange={(e) => setCurrentSettings({...currentSettings, maxCpc: Number(e.target.value)})}
                              className={cn("w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-blue-200")}
                            />
                            <p className={cn("text-[10px] leading-tight", darkMode ? "text-blue-400" : "text-blue-600")}>Setting a Max CPC gives you full control over how much you pay per click, but may limit impressions if too low.</p>
                          </div>
                        )}
                        {(currentSettings.bidStrategy === 'target_roas' || currentSettings.bidStrategy === 'target_cpa') && (
                          <div className={cn("mt-4 p-3 rounded-lg border space-y-2", darkMode ? "bg-amber-900/20 border-amber-900/30" : "bg-amber-50 border-amber-100")}>
                            <label className={cn("block text-xs font-bold uppercase", darkMode ? "text-amber-400" : "text-amber-800")}>
                              {currentSettings.bidStrategy === 'target_roas' ? 'Target ROAS (x)' : 'Target CPA ($)'}
                            </label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={currentSettings.bidStrategy === 'target_roas' ? currentSettings.targetRoas || 2.0 : currentSettings.targetCpa || 50} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (currentSettings.bidStrategy === 'target_roas') setCurrentSettings({...currentSettings, targetRoas: val});
                                else setCurrentSettings({...currentSettings, targetCpa: val});
                              }}
                              className={cn("w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-amber-200")}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audience Targeting Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Target className="text-pink-500" /> Audience Targeting</h3>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", darkMode ? "bg-pink-900/20 text-pink-400" : "bg-pink-50 text-pink-600")}>
                      Precision: High
                    </div>
                  </div>
                  
                  <p className={cn("text-xs leading-relaxed", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Define who should see your ads. Precise targeting reduces wasted spend by ensuring your ads are only shown to users who match your ideal customer profile.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        Industry <Info size={12} className="text-slate-400" />
                      </label>
                      <select 
                        value={currentSettings.industry}
                        onChange={(e) => setCurrentSettings({...currentSettings, industry: e.target.value})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                      >
                        <option>B2B SaaS</option>
                        <option>E-commerce</option>
                        <option>Healthcare</option>
                        <option>Real Estate</option>
                        <option>Education</option>
                      </select>
                      <p className="text-[10px] text-slate-500 italic">Targeting specific business sectors.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        Company Size <Info size={12} className="text-slate-400" />
                      </label>
                      <select 
                        value={currentSettings.companySize}
                        onChange={(e) => setCurrentSettings({...currentSettings, companySize: e.target.value})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                      >
                        <option>Startup</option>
                        <option>Mid-market</option>
                        <option>Enterprise</option>
                      </select>
                      <p className="text-[10px] text-slate-500 italic">Filter by organization scale.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        Device <Info size={12} className="text-slate-400" />
                      </label>
                      <select 
                        value={currentSettings.device}
                        onChange={(e) => setCurrentSettings({...currentSettings, device: e.target.value})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                      >
                        <option>All Devices</option>
                        <option>Desktop</option>
                        <option>Mobile</option>
                      </select>
                      <p className="text-[10px] text-slate-500 italic">Optimize for user hardware.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Age Range</label>
                      <input 
                        type="text" 
                        value={currentSettings.ageRange.join(', ')}
                        onChange={(e) => setCurrentSettings({...currentSettings, ageRange: e.target.value.split(',').map(s => s.trim())})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                        placeholder="e.g. 25-34, 35-44"
                      />
                      <p className="text-[10px] text-slate-500">Demographic filtering by age groups.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Gender</label>
                      <input 
                        type="text" 
                        value={currentSettings.gender.join(', ')}
                        onChange={(e) => setCurrentSettings({...currentSettings, gender: e.target.value.split(',').map(s => s.trim())})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                        placeholder="e.g. Male, Female"
                      />
                      <p className="text-[10px] text-slate-500">Targeting based on gender identity.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Interests</label>
                      <input 
                        type="text" 
                        value={currentSettings.interests.join(', ')}
                        onChange={(e) => setCurrentSettings({...currentSettings, interests: e.target.value.split(',').map(s => s.trim())})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                        placeholder="e.g. Business Services, Advertising"
                      />
                      <p className="text-[10px] text-slate-500">Reach people based on their habits and interests.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Demographics</label>
                      <input 
                        type="text" 
                        value={currentSettings.demographics.join(', ')}
                        onChange={(e) => setCurrentSettings({...currentSettings, demographics: e.target.value.split(',').map(s => s.trim())})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                        placeholder="e.g. Decision Makers, Professionals"
                      />
                      <p className="text-[10px] text-slate-500">Target by life stages, education, or job titles.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          value={currentSettings.location}
                          onChange={(e) => setCurrentSettings({...currentSettings, location: e.target.value})}
                          className={cn("w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                          placeholder="e.g. United States"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Geographic targeting for your ads.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Simulation Duration</label>
                      <select 
                        value={currentSettings.duration}
                        onChange={(e) => setCurrentSettings({...currentSettings, duration: parseInt(e.target.value)})}
                        className={cn("w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                      </select>
                      <p className="text-[10px] text-slate-500">How long the simulation should run.</p>
                    </div>
                  </div>
                </div>

                {/* Campaign Keywords Section */}
                <div className={cn("p-8 rounded-2xl border shadow-sm space-y-6 transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <div className="flex justify-between items-center">
                    <h3 className={cn("text-xl font-bold flex items-center gap-2 transition-colors", darkMode ? "text-white" : "text-slate-900")}><TableIcon size={20} className="text-blue-600" /> Campaign Keywords</h3>
                    <button 
                      onClick={() => setActiveTab('keyword-research')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1"
                    >
                      <Search size={16} /> Research More
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className={cn("block text-sm font-semibold transition-colors", darkMode ? "text-slate-300" : "text-slate-700")}>Selected Keywords ({currentSettings.keywords.length})</label>
                      <button 
                        onClick={() => setCurrentSettings({...currentSettings, keywords: [...currentSettings.keywords, { text: '', matchType: 'phrase' }]})}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Manual
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      {currentSettings.keywords.map((kw, i) => (
                        <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg border transition-colors", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}>
                          <input 
                            type="text" 
                            value={kw.text} 
                            onChange={(e) => {
                              const newKws = [...currentSettings.keywords];
                              newKws[i].text = e.target.value;
                              setCurrentSettings({...currentSettings, keywords: newKws});
                            }}
                            className={cn("flex-1 px-3 py-1 text-sm rounded outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-900 border border-slate-700 text-white" : "bg-white border border-slate-200 text-slate-900")}
                            placeholder="Keyword..."
                          />
                          <select 
                            value={kw.matchType}
                            onChange={(e) => {
                              const newKws = [...currentSettings.keywords];
                              newKws[i].matchType = e.target.value as any;
                              setCurrentSettings({...currentSettings, keywords: newKws});
                            }}
                            className={cn("text-xs rounded px-1 py-0.5 transition-colors", darkMode ? "bg-slate-900 border border-slate-700 text-white" : "bg-white border border-slate-200 text-slate-900")}
                          >
                            <option value="broad">Broad</option>
                            <option value="phrase">Phrase</option>
                            <option value="exact">Exact</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newKws = currentSettings.keywords.filter((_, idx) => idx !== i);
                              setCurrentSettings({...currentSettings, keywords: newKws});
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={cn("mt-6 p-4 rounded-xl border space-y-3 transition-colors", darkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50 border-blue-100")}>
                    <h4 className={cn("text-sm font-bold flex items-center gap-2 transition-colors", darkMode ? "text-blue-400" : "text-blue-900")}>
                      <Info size={16} /> Match Type Guide
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(TERMINOLOGY.matchType.options).map(([key, opt]: [string, any]) => (
                        <div key={key} className="space-y-1">
                          <span className={cn("text-xs font-bold uppercase transition-colors", darkMode ? "text-blue-400" : "text-blue-700")}>{opt.title}</span>
                          <p className={cn("text-[11px] leading-relaxed transition-colors", darkMode ? "text-slate-300" : "text-blue-800")}>{opt.description}</p>
                          <p className={cn("text-[10px] italic transition-colors", darkMode ? "text-blue-400" : "text-blue-600")}>Impact: {opt.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Ad Creative Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> Responsive Search Ad</h3>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ad Strength</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white", calculateAdStrength(currentSettings).color)}>
                          {calculateAdStrength(currentSettings).label}
                        </span>
                      </div>
                      <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", calculateAdStrength(currentSettings).color)} 
                          style={{ width: `${calculateAdStrength(currentSettings).score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={cn("block text-sm font-semibold mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Final URL</label>
                      <input 
                        type="text" 
                        value={currentSettings.finalUrl}
                        onChange={(e) => setCurrentSettings({...currentSettings, finalUrl: e.target.value})}
                        className={cn("w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")}
                        placeholder="https://www.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={cn("block text-sm font-semibold", darkMode ? "text-slate-300" : "text-slate-700")}>Headlines (up to 15)</label>
                        <button 
                          onClick={() => setCurrentSettings({...currentSettings, headlines: [...currentSettings.headlines, '']})}
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Headline
                        </button>
                      </div>
                      {currentSettings.headlines.map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            type="text" 
                            value={h}
                            maxLength={30}
                            onChange={(e) => {
                              const newH = [...currentSettings.headlines];
                              newH[i] = e.target.value;
                              setCurrentSettings({...currentSettings, headlines: newH});
                            }}
                            className={cn("flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")}
                            placeholder={`Headline ${i + 1}`}
                          />
                          {currentSettings.headlines.length > 1 && (
                            <button onClick={() => setCurrentSettings({...currentSettings, headlines: currentSettings.headlines.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={cn("block text-sm font-semibold", darkMode ? "text-slate-300" : "text-slate-700")}>Descriptions (up to 4)</label>
                        <button 
                          onClick={() => setCurrentSettings({...currentSettings, descriptions: [...currentSettings.descriptions, '']})}
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Description
                        </button>
                      </div>
                      {currentSettings.descriptions.map((d, i) => (
                        <div key={i} className="flex gap-2">
                          <textarea 
                            value={d}
                            maxLength={90}
                            onChange={(e) => {
                              const newD = [...currentSettings.descriptions];
                              newD[i] = e.target.value;
                              setCurrentSettings({...currentSettings, descriptions: newD});
                            }}
                            className={cn("flex-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-colors h-16 resize-none", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")}
                            placeholder={`Description ${i + 1}`}
                          />
                          {currentSettings.descriptions.length > 1 && (
                            <button onClick={() => setCurrentSettings({...currentSettings, descriptions: currentSettings.descriptions.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ad Preview */}
                <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <h3 className={cn("text-lg font-bold mb-4", darkMode ? "text-white" : "text-slate-900")}>Ad Preview</h3>
                  <div className={cn("border rounded-xl p-6 shadow-sm max-w-md mx-auto transition-colors", darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200")}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors", darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-700")}>Ad</div>
                      <span className={cn("text-xs truncate transition-colors", darkMode ? "text-slate-400" : "text-slate-600")}>{currentSettings.finalUrl || 'https://www.example.com'}</span>
                    </div>
                    <h4 className={cn("text-xl font-medium mb-1 truncate transition-colors", darkMode ? "text-blue-400" : "text-blue-700")}>
                      {currentSettings.headlines[0] || 'Headline 1'} | {currentSettings.headlines[1] || 'Headline 2'}
                    </h4>
                    <p className={cn("text-sm line-clamp-2 transition-colors", darkMode ? "text-slate-400" : "text-slate-600")}>
                      {currentSettings.descriptions[0] || 'Your ad description will appear here.'}
                    </p>
                  </div>
                </div>

                <button onClick={handleRunSimulation} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg">Launch Simulation</button>
              </div>
            </motion.div>
          )}

          {activeTab === 'simulation' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-800 min-h-[500px] flex flex-col font-mono text-sm">
                <div className="flex justify-between items-center mb-8 text-white">
                  <span>SIMULATION_ENGINE_V2.0</span>
                  <span>STATUS: {isSimulating ? 'EXECUTING' : 'COMPLETE'}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {simLogs.map((log, i) => (
                    <div key={i} className="text-emerald-400">[{new Date().toLocaleTimeString()}] {log}</div>
                  ))}
                </div>
                {!isSimulating && (
                  <button onClick={() => setActiveTab('results')} className="mt-8 px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all">View Results</button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'results' && lastResult && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Campaign Performance Analysis</h2>
                  <p className="text-slate-500 text-sm">Detailed breakdown of your simulation results and AI-driven optimizations.</p>
                </div>
                <div className={cn("flex items-center gap-3 p-2 rounded-xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Select Campaign</label>
                  <select 
                    value={lastResult.id}
                    onChange={(e) => {
                      const selected = history.find(h => h.id === e.target.value);
                      if (selected) {
                        setLastResult(selected);
                        generateAiInsights(selected);
                      }
                    }}
                    className={cn("px-4 py-2 border rounded-lg text-sm font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] transition-colors", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}
                  >
                    {history.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.campaignSettings.name} ({new Date(h.timestamp).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <ResultCard title="Conversions" value={lastResult.metrics.conversions} color="text-emerald-600 dark:text-emerald-400" />
                <ResultCard title="ROAS" value={`${lastResult.metrics.roas.toFixed(2)}x`} color="text-blue-600 dark:text-blue-400" />
                <ResultCard title="Avg. CPC" value={`$${lastResult.metrics.cpc.toFixed(2)}`} color="text-slate-900 dark:text-white" />
                <ResultCard title="CTR" value={`${(lastResult.metrics.ctr * 100).toFixed(2)}%`} color="text-purple-600 dark:text-purple-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* AI Insights Section */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Zap className="text-amber-500" /> AI Optimization Insights</h3>
                    {(() => {
                      try {
                        const insights = JSON.parse(aiInsights);
                        return (
                          <div className="space-y-6">
                            <div className={cn("p-4 rounded-xl text-sm italic transition-colors", darkMode ? "bg-blue-900/20 border border-blue-900/30 text-blue-300" : "bg-blue-50 border border-blue-100 text-blue-800")}>
                              "{insights.analysis}"
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {insights.tips.map((tip: any, i: number) => (
                                <div key={i} className={cn("p-6 border rounded-2xl space-y-4 transition-colors", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm font-bold border transition-colors", darkMode ? "bg-slate-900 text-blue-400 border-slate-700" : "bg-white text-blue-600 border-slate-100")}>
                                      {i + 1}
                                    </div>
                                    <h4 className={cn("font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>{tip.title}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-red-500 uppercase">Problem</span>
                                      <p className={cn("transition-colors", darkMode ? "text-slate-400" : "text-slate-600")}>{tip.problem}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Solution</span>
                                      <p className={cn("transition-colors", darkMode ? "text-slate-400" : "text-slate-600")}>{tip.solution}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-blue-600 uppercase">Expected Result</span>
                                      <p className={cn("font-medium transition-colors", darkMode ? "text-blue-400" : "text-slate-600")}>{tip.expectedResult}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return <div className="text-slate-500 italic">Analyzing results...</div>;
                      }
                    })()}
                  </div>

                  {/* Previous Campaign Analysis */}
                  {history.length > 1 && (
                    <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                      <h3 className={cn("text-xl font-bold mb-6 flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                        <History className="text-blue-600" /> Historical Comparison
                      </h3>
                      <div className="space-y-4">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...history].reverse().slice(-5)}>
                              <XAxis dataKey="campaignSettings.name" hide />
                              <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className={cn("p-4 border rounded-xl shadow-xl transition-colors", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                                        <p className={cn("font-bold mb-2", darkMode ? "text-white" : "text-slate-900")}>{data.campaignSettings.name}</p>
                                        <div className="space-y-1 text-xs">
                                          <div className="flex justify-between gap-4">
                                            <span className="text-slate-500">ROAS:</span>
                                            <span className="font-bold text-blue-600">{data.metrics.roas.toFixed(2)}x</span>
                                          </div>
                                          <div className="flex justify-between gap-4">
                                            <span className="text-slate-500">Conversions:</span>
                                            <span className="font-bold text-emerald-600">{data.metrics.conversions}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="metrics.roas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {history.slice(1, 3).map((prev, i) => {
                            const roasDiff = ((lastResult.metrics.roas - prev.metrics.roas) / prev.metrics.roas) * 100;
                            return (
                              <div key={i} className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-slate-500 uppercase">Vs. {prev.campaignSettings.name}</span>
                                  <span className={cn("text-xs font-bold", roasDiff >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {roasDiff >= 0 ? '+' : ''}{roasDiff.toFixed(1)}% ROAS
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("flex-1 h-2 rounded-full overflow-hidden transition-colors", darkMode ? "bg-slate-700" : "bg-slate-200")}>
                                    <div 
                                      className={cn("h-full transition-all duration-500", roasDiff >= 0 ? "bg-emerald-500" : "bg-red-500")} 
                                      style={{ width: `${Math.min(Math.abs(roasDiff), 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Setup Evolution */}
                  {campaignChanges && (
                    <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className={cn("text-xl font-bold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                          <History className="text-purple-600" /> Campaign Setup Evolution
                        </h3>
                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", 
                          campaignChanges.impact === 'better' ? "bg-emerald-900/20 text-emerald-400" : 
                          (campaignChanges.impact === 'worse' ? "bg-red-900/20 text-red-400" : "bg-slate-800 text-slate-400")
                        )}>
                          Impact: {campaignChanges.impact}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className={cn("p-4 rounded-xl text-sm transition-colors", darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-700")}>
                          <p>
                            Compared to the previous simulation <strong>({campaignChanges.prevName})</strong>, you made <strong>{campaignChanges.changes.length}</strong> changes to the campaign setup. 
                            {campaignChanges.impact === 'better' ? " These adjustments have led to an overall improvement in performance metrics." : 
                             (campaignChanges.impact === 'worse' ? " These changes appear to have negatively impacted the campaign's performance." : " The performance remained relatively stable despite these modifications.")}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead>
                              <tr className={cn("border-b transition-colors", darkMode ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500")}>
                                <th className="pb-3 font-semibold">Setting</th>
                                <th className="pb-3 font-semibold">Previous</th>
                                <th className="pb-3 font-semibold">Current</th>
                                <th className="pb-3 font-semibold">Change</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {campaignChanges.changes.map((change, i) => (
                                <tr key={i} className="group">
                                  <td className={cn("py-4 font-medium transition-colors", darkMode ? "text-slate-300" : "text-slate-900")}>{change.setting}</td>
                                  <td className={cn("py-4 transition-colors", darkMode ? "text-slate-500" : "text-slate-500")}>{change.prev}</td>
                                  <td className={cn("py-4 font-medium transition-colors", darkMode ? "text-slate-300" : "text-slate-900")}>{change.curr}</td>
                                  <td className="py-4">
                                    <div className="flex items-center gap-1">
                                      {change.type === 'increase' && <ArrowUpRight size={14} className="text-emerald-500" />}
                                      {change.type === 'decrease' && <ArrowDownRight size={14} className="text-red-500" />}
                                      {change.type === 'modified' && <Minus size={14} className="text-blue-500" />}
                                      <span className={cn("text-[10px] font-bold uppercase", 
                                        change.type === 'increase' ? "text-emerald-500" : 
                                        (change.type === 'decrease' ? "text-red-500" : "text-blue-500")
                                      )}>
                                        {change.type}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
                    <h3 className="text-lg font-bold mb-4">Campaign Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Strategy</span>
                        <span className="font-medium capitalize">{lastResult.campaignSettings.bidStrategy.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total Cost</span>
                        <span className="font-medium text-emerald-400">${lastResult.metrics.cost.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Keywords Used</h4>
                      <div className="flex flex-wrap gap-2">
                        {lastResult.campaignSettings.keywords.map((kw, i) => (
                          <span key={i} className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/5">
                            {kw.matchType === 'exact' ? `[${kw.text}]` : kw.matchType === 'phrase' ? `"${kw.text}"` : kw.text}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('setup')}
                      className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
                    >
                      Iterate Campaign
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-8">
              <div className={cn("p-12 rounded-3xl border-2 border-dashed text-center space-y-6 transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                <Upload size={40} className="mx-auto text-blue-600" />
                <h3 className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>Import Historical Data</h3>
                <div className="flex justify-center gap-4">
                  <label className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors">Browse <input type="file" className="hidden" onChange={handleFileUpload} /></label>
                  <button onClick={() => setImportedData([{Date: '2024-01-01', Clicks: 100, Conversions: 10}])} className={cn("px-6 py-3 rounded-xl font-bold transition-colors", darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>Sample Data</button>
                </div>
              </div>
              {importedData.length > 0 && (
                <div className={cn("p-8 rounded-2xl border h-80 transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={importedData}>
                      <XAxis dataKey="Date" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                      <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                      <Tooltip 
                        contentStyle={darkMode ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' } : {}}
                        itemStyle={darkMode ? { color: '#3b82f6' } : {}}
                      />
                      <Bar dataKey="Clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {activeTab === 'optimize' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <h3 className={cn("text-xl font-bold mb-6 flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                    <Zap className="text-blue-600" /> A/B Testing Configuration
                  </h3>
                  
                  {!testVariation ? (
                    <div className="text-center py-12 space-y-4">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors", darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600")}>
                        <Plus size={32} />
                      </div>
                      <h4 className={cn("text-lg font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>Create a Variation</h4>
                      <p className={cn("max-w-xs mx-auto transition-colors", darkMode ? "text-slate-400" : "text-slate-500")}>Duplicate your current campaign settings to start testing new headlines and descriptions.</p>
                      <button 
                        onClick={() => setTestVariation({...currentSettings})}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                      >
                        Initialize Variation
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className={cn("text-sm font-bold uppercase tracking-wider transition-colors", darkMode ? "text-slate-400" : "text-slate-500")}>Headlines Variation</h4>
                          <button 
                            onClick={() => setTestVariation({...testVariation, headlines: [...testVariation.headlines, '']})}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Headline
                          </button>
                        </div>
                        {testVariation.headlines.map((h, i) => (
                          <div key={i} className="flex gap-2">
                            <input 
                              type="text" 
                              value={h} 
                              onChange={(e) => {
                                const newHeadlines = [...testVariation.headlines];
                                newHeadlines[i] = e.target.value;
                                setTestVariation({...testVariation, headlines: newHeadlines});
                              }}
                              className={cn("flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                              placeholder={`Headline ${i + 1}`}
                            />
                            {testVariation.headlines.length > 1 && (
                              <button 
                                onClick={() => setTestVariation({...testVariation, headlines: testVariation.headlines.filter((_, idx) => idx !== i)})}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className={cn("text-sm font-bold uppercase tracking-wider transition-colors", darkMode ? "text-slate-400" : "text-slate-500")}>Descriptions Variation</h4>
                          <button 
                            onClick={() => setTestVariation({...testVariation, descriptions: [...testVariation.descriptions, '']})}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Description
                          </button>
                        </div>
                        {testVariation.descriptions.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <textarea 
                              value={d} 
                              onChange={(e) => {
                                const newDescs = [...testVariation.descriptions];
                                newDescs[i] = e.target.value;
                                setTestVariation({...testVariation, descriptions: newDescs});
                              }}
                              className={cn("flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20 resize-none transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                              placeholder={`Description ${i + 1}`}
                            />
                            {testVariation.descriptions.length > 1 && (
                              <button 
                                onClick={() => setTestVariation({...testVariation, descriptions: testVariation.descriptions.filter((_, idx) => idx !== i)})}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className={cn("pt-6 border-t flex gap-4 transition-colors", darkMode ? "border-slate-800" : "border-slate-100")}>
                        <button 
                          onClick={handleRunABTest}
                          disabled={isAbTesting}
                          className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                        >
                          {isAbTesting ? 'Running Test...' : 'Run A/B Test'}
                        </button>
                        <button 
                          onClick={() => { setTestVariation(null); setAbTestResults(null); }}
                          className={cn("px-6 py-4 font-bold rounded-xl transition-all", darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                  <h3 className={cn("text-xl font-bold mb-6 transition-colors", darkMode ? "text-white" : "text-slate-900")}>Improvement Tracking</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...history].reverse()}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} />
                        <Tooltip 
                          contentStyle={darkMode ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' } : {}}
                          itemStyle={darkMode ? { color: '#3b82f6' } : {}}
                        />
                        <Line type="monotone" dataKey="metrics.roas" stroke="#3b82f6" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={cn("text-xs mt-4 text-center italic transition-colors", darkMode ? "text-slate-500" : "text-slate-500")}>Tracking ROAS performance over your campaign history.</p>
                </div>
              </div>

              {abTestResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}
                >
                  <h3 className={cn("text-xl font-bold mb-8 transition-colors", darkMode ? "text-white" : "text-slate-900")}>A/B Test Results Comparison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("font-bold transition-colors", darkMode ? "text-slate-300" : "text-slate-900")}>Original Campaign</h4>
                        <span className={cn("px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors", darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600")}>Control</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={cn("p-4 rounded-xl transition-colors", darkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">ROAS</div>
                          <div className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>{abTestResults.original.metrics.roas.toFixed(2)}x</div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", darkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Conv. Rate</div>
                          <div className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>{(abTestResults.original.metrics.conversionRate * 100).toFixed(2)}%</div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", darkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CTR</div>
                          <div className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>{(abTestResults.original.metrics.ctr * 100).toFixed(2)}%</div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", darkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost</div>
                          <div className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>${abTestResults.original.metrics.cost.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-blue-600 dark:text-blue-400">Variation Campaign</h4>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">Test</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={cn("p-4 rounded-xl transition-colors", abTestResults.variation.metrics.roas > abTestResults.original.metrics.roas ? (darkMode ? "bg-emerald-900/20 border border-emerald-900/30" : "bg-emerald-50 border border-emerald-100") : (darkMode ? "bg-slate-800" : "bg-slate-50"))}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">ROAS</div>
                          <div className={cn("text-2xl font-bold", abTestResults.variation.metrics.roas > abTestResults.original.metrics.roas ? "text-emerald-600 dark:text-emerald-400" : (darkMode ? "text-white" : "text-slate-900"))}>
                            {abTestResults.variation.metrics.roas.toFixed(2)}x
                          </div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", abTestResults.variation.metrics.conversionRate > abTestResults.original.metrics.conversionRate ? (darkMode ? "bg-emerald-900/20 border border-emerald-900/30" : "bg-emerald-50 border border-emerald-100") : (darkMode ? "bg-slate-800" : "bg-slate-50"))}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Conv. Rate</div>
                          <div className={cn("text-2xl font-bold", abTestResults.variation.metrics.conversionRate > abTestResults.original.metrics.conversionRate ? "text-emerald-600 dark:text-emerald-400" : (darkMode ? "text-white" : "text-slate-900"))}>
                            {(abTestResults.variation.metrics.conversionRate * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", abTestResults.variation.metrics.ctr > abTestResults.original.metrics.ctr ? (darkMode ? "bg-emerald-900/20 border border-emerald-900/30" : "bg-emerald-50 border border-emerald-100") : (darkMode ? "bg-slate-800" : "bg-slate-50"))}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CTR</div>
                          <div className={cn("text-2xl font-bold", abTestResults.variation.metrics.ctr > abTestResults.original.metrics.ctr ? "text-emerald-600 dark:text-emerald-400" : (darkMode ? "text-white" : "text-slate-900"))}>
                            {(abTestResults.variation.metrics.ctr * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className={cn("p-4 rounded-xl transition-colors", darkMode ? "bg-slate-800" : "bg-slate-50")}>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost</div>
                          <div className={cn("text-2xl font-bold transition-colors", darkMode ? "text-white" : "text-slate-900")}>${abTestResults.variation.metrics.cost.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn("mt-12 p-6 rounded-2xl border transition-colors", darkMode ? "bg-blue-900/20 border-blue-900/30" : "bg-blue-50 border-blue-100")}>
                    <h4 className={cn("font-bold mb-2 flex items-center gap-2 transition-colors", darkMode ? "text-blue-400" : "text-blue-900")}>
                      <Zap size={18} /> A/B Test Conclusion
                    </h4>
                    <p className={cn("text-sm transition-colors", darkMode ? "text-blue-300" : "text-blue-800")}>
                      {abTestResults.variation.metrics.roas > abTestResults.original.metrics.roas 
                        ? `The variation outperformed the original campaign with a ${((abTestResults.variation.metrics.roas / abTestResults.original.metrics.roas - 1) * 100).toFixed(1)}% improvement in ROAS. We recommend applying these changes to your main campaign.`
                        : "The original campaign performed better in this test. Consider trying different headlines or descriptions in your next variation to find a winner."}
                    </p>
                    {abTestResults.variation.metrics.roas > abTestResults.original.metrics.roas && (
                      <button 
                        onClick={() => {
                          setCurrentSettings({...testVariation});
                          setAbTestResults(null);
                          setTestVariation(null);
                          setActiveTab('setup');
                        }}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Apply Variation to Campaign
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}
          {activeTab === 'learning' && (
            <motion.div key="learning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className={cn("p-8 rounded-2xl border shadow-sm transition-colors", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
                    <h3 className={cn("text-2xl font-bold mb-8 flex items-center gap-2 transition-colors", darkMode ? "text-white" : "text-slate-900")}><BookOpen className="text-blue-600" /> Ad Metrics Glossary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {Object.entries(TERMINOLOGY).map(([key, term]: [string, any]) => (
                        <div key={key} className={cn("p-6 rounded-2xl border transition-all", darkMode ? "bg-slate-800 border-slate-700 hover:border-blue-500/50" : "bg-slate-50 border-slate-100 hover:border-blue-200")}>
                          <h4 className={cn("text-lg font-bold mb-2 transition-colors", darkMode ? "text-white" : "text-slate-900")}>{term.title}</h4>
                          <p className={cn("text-sm mb-4 transition-colors", darkMode ? "text-slate-400" : "text-slate-600")}>{term.definition}</p>
                          {term.formula && (
                            <div className={cn("p-3 rounded-lg text-xs font-mono mb-4 transition-colors", darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-700")}>
                              Formula: {term.formula}
                            </div>
                          )}
                          <p className={cn("text-xs italic transition-colors", darkMode ? "text-slate-500" : "text-slate-500")}>"{term.meaning}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className={cn("p-8 rounded-2xl shadow-xl transition-colors", darkMode ? "bg-slate-900 border border-slate-800 text-white" : "bg-slate-900 text-white")}>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calculator className="text-emerald-400" /> Metrics Calculator</h3>
                    <p className="text-slate-400 text-sm mb-8">Enter your numbers to see how metrics are calculated in real-time.</p>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Impressions</label>
                        <input 
                          type="number" 
                          id="calc-imps"
                          defaultValue={10000}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          onChange={(e) => {
                            const imps = parseInt(e.target.value) || 0;
                            const clicks = parseInt((document.getElementById('calc-clicks') as HTMLInputElement).value) || 0;
                            const cost = parseFloat((document.getElementById('calc-cost') as HTMLInputElement).value) || 0;
                            const convs = parseInt((document.getElementById('calc-convs') as HTMLInputElement).value) || 0;
                            
                            const ctrEl = document.getElementById('res-ctr');
                            const cpmEl = document.getElementById('res-cpm');
                            const cpaEl = document.getElementById('res-cpa');
                            if (ctrEl) ctrEl.innerText = imps > 0 ? ((clicks / imps) * 100).toFixed(2) + '%' : '0%';
                            if (cpmEl) cpmEl.innerText = imps > 0 ? '$' + ((cost / imps) * 1000).toFixed(2) : '$0';
                            if (cpaEl) cpaEl.innerText = convs > 0 ? '$' + (cost / convs).toFixed(2) : '$0';
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clicks</label>
                        <input 
                          type="number" 
                          id="calc-clicks"
                          defaultValue={300}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          onChange={(e) => {
                            const clicks = parseInt(e.target.value) || 0;
                            const imps = parseInt((document.getElementById('calc-imps') as HTMLInputElement).value) || 0;
                            const cost = parseFloat((document.getElementById('calc-cost') as HTMLInputElement).value) || 0;
                            const convs = parseInt((document.getElementById('calc-convs') as HTMLInputElement).value) || 0;
                            
                            const ctrEl = document.getElementById('res-ctr');
                            const cpcEl = document.getElementById('res-cpc');
                            const cvrEl = document.getElementById('res-cvr');
                            const cpaEl = document.getElementById('res-cpa');
                            if (ctrEl) ctrEl.innerText = imps > 0 ? ((clicks / imps) * 100).toFixed(2) + '%' : '0%';
                            if (cpcEl) cpcEl.innerText = clicks > 0 ? '$' + (cost / clicks).toFixed(2) : '$0';
                            if (cvrEl) cvrEl.innerText = clicks > 0 ? ((convs / clicks) * 100).toFixed(2) + '%' : '0%';
                            if (cpaEl) cpaEl.innerText = convs > 0 ? '$' + (cost / convs).toFixed(2) : '$0';
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Cost ($)</label>
                        <input 
                          type="number" 
                          id="calc-cost"
                          defaultValue={500}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          onChange={(e) => {
                            const cost = parseFloat(e.target.value) || 0;
                            const clicks = parseInt((document.getElementById('calc-clicks') as HTMLInputElement).value) || 0;
                            const imps = parseInt((document.getElementById('calc-imps') as HTMLInputElement).value) || 0;
                            const convs = parseInt((document.getElementById('calc-convs') as HTMLInputElement).value) || 0;
                            
                            const cpcEl = document.getElementById('res-cpc');
                            const cpmEl = document.getElementById('res-cpm');
                            const cpaEl = document.getElementById('res-cpa');
                            if (cpcEl) cpcEl.innerText = clicks > 0 ? '$' + (cost / clicks).toFixed(2) : '$0';
                            if (cpmEl) cpmEl.innerText = imps > 0 ? '$' + ((cost / imps) * 1000).toFixed(2) : '$0';
                            if (cpaEl) cpaEl.innerText = convs > 0 ? '$' + (cost / convs).toFixed(2) : '$0';
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conversions</label>
                        <input 
                          type="number" 
                          id="calc-convs"
                          defaultValue={15}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          onChange={(e) => {
                            const convs = parseInt(e.target.value) || 0;
                            const clicks = parseInt((document.getElementById('calc-clicks') as HTMLInputElement).value) || 0;
                            const cost = parseFloat((document.getElementById('calc-cost') as HTMLInputElement).value) || 0;
                            
                            const cvrEl = document.getElementById('res-cvr');
                            const cpaEl = document.getElementById('res-cpa');
                            if (cvrEl) cvrEl.innerText = clicks > 0 ? ((convs / clicks) * 100).toFixed(2) + '%' : '0%';
                            if (cpaEl) cpaEl.innerText = convs > 0 ? '$' + (cost / convs).toFixed(2) : '$0';
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-white/10 grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CTR</div>
                        <div id="res-ctr" className="text-xl font-bold text-blue-400">3.00%</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CPC</div>
                        <div id="res-cpc" className="text-xl font-bold text-emerald-400">$1.67</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CPM</div>
                        <div id="res-cpm" className="text-xl font-bold text-purple-400">$50.00</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Conv. Rate</div>
                        <div id="res-cvr" className="text-xl font-bold text-amber-400">5.00%</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CPA</div>
                        <div id="res-cpa" className="text-xl font-bold text-pink-400">$33.33</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium", 
        active 
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
          : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
      )}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{icon}</div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h4>
    </div>
  );
}

function ResultCard({ title, value, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h4 className={cn("text-3xl font-bold", color)}>{value}</h4>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <Info size={14} className="text-slate-400 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );
}
