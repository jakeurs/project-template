import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Box, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal,
  RefreshCw,
  Server,
  LayoutDashboard,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const API_URL = import.meta.env.VITE_API_URL || 'ws://localhost:10004';

const Dashboard = () => {
  const [status, setStatus] = useState({
    containers: [],
    tests: {
      backend: { passed: 0, failed: 0 },
      frontend: { passed: 0, failed: 0 }
    }
  });
  const [logs, setLogs] = useState([
    { id: 1, timestamp: new Date().toISOString(), message: '[SYSTEM] Monitor service started.', type: 'info' },
    { id: 2, timestamp: new Date().toISOString(), message: '[SYSTEM] Connected to Docker daemon.', type: 'success' },
    { id: 3, timestamp: new Date().toISOString(), message: '[SYSTEM] Watching for test results in /workspace...', type: 'info' }
  ]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const ws = useRef(null);

  const connect = useCallback(() => {
    try {
      const socketUrl = API_URL.startsWith('http') 
        ? API_URL.replace('http', 'ws') + '/ws'
        : API_URL + '/ws';
      
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        setConnected(true);
        console.log('Connected to Monitor API');
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setStatus(data);
        setLastUpdate(new Date());
        // For now, we don't receive logs via WS, but we could append them here if we did
      };

      ws.current.onclose = () => {
        setConnected(false);
        console.log('Disconnected from Monitor API, retrying...');
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.current.close();
      };
    } catch (error) {
      console.error('Connection error:', error);
      setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  const testData = [
    { name: 'Backend', passed: status.tests.backend.passed, failed: status.tests.backend.failed },
    { name: 'Frontend', passed: status.tests.frontend.passed, failed: status.tests.frontend.failed },
  ];

  const LogRow = ({ index, style }) => {
    const log = logs[index];
    let colorClass = 'text-slate-300';
    if (log.type === 'info') colorClass = 'text-slate-400';
    if (log.type === 'success') colorClass = 'text-indigo-400';
    if (log.type === 'error') colorClass = 'text-rose-400';

    return (
      <div style={style} className={`font-mono text-sm px-2 flex gap-2 ${index % 2 === 0 ? 'bg-slate-900/30' : ''}`}>
        <span className="text-slate-600 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
        <span className={colorClass}>{log.message}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Ralph Wiggum Monitor</h1>
            <p className="text-xs text-slate-400">Autonomous Development Loop</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-sm font-medium text-slate-300">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Active Containers" 
            value={status.containers.filter(c => c.status === 'running').length}
            icon={<Box className="w-5 h-5 text-indigo-400" />}
            subtitle={`Out of ${status.containers.length} total`}
          />
          <StatCard 
            title="Tests Passed" 
            value={status.tests.backend.passed + status.tests.frontend.passed}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            subtitle="Combined success"
          />
          <StatCard 
            title="Tests Failed" 
            value={status.tests.backend.failed + status.tests.frontend.failed}
            icon={<XCircle className="w-5 h-5 text-rose-400" />}
            subtitle="Requires attention"
            trend={status.tests.backend.failed + status.tests.frontend.failed > 0 ? 'bad' : 'good'}
          />
          <StatCard 
            title="Loop Status" 
            value={connected ? 'Active' : 'Stopped'}
            icon={<RefreshCw className={`w-5 h-5 ${connected ? 'text-amber-400 animate-spin-slow' : 'text-slate-500'}`} />}
            subtitle="System heartbeat"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Container List */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                Containers
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {status.containers.map((container) => (
                    <tr key={container.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{container.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          container.status === 'running' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {container.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{container.id}</td>
                    </tr>
                  ))}
                  {status.containers.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-slate-500 italic">
                        No containers found for this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Visualization */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Test Summary
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="passed" stackId="a" radius={[0, 0, 0, 0]}>
                    {testData.map((entry, index) => (
                      <Cell key={`cell-p-${index}`} fill="#10b981" />
                    ))}
                  </Bar>
                  <Bar dataKey="failed" stackId="a" radius={[4, 4, 0, 0]}>
                    {testData.map((entry, index) => (
                      <Cell key={`cell-f-${index}`} fill="#f43f5e" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-2">
               <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Passed</span>
                  <span className="font-bold text-emerald-400">{status.tests.backend.passed + status.tests.frontend.passed}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Failed</span>
                  <span className="font-bold text-rose-400">{status.tests.backend.failed + status.tests.frontend.failed}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Console / Logs */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-80">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <h2 className="font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Console Logs
            </h2>
            <button className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              <Search className="w-3 h-3" />
              Search logs
            </button>
          </div>
          <div className="flex-1 bg-slate-950/50 p-2">
            <AutoSizer>
              {({ height, width }) => (
                <List
                  className="log-viewer"
                  height={height}
                  itemCount={logs.length}
                  itemSize={24}
                  width={width}
                >
                  {LogRow}
                </List>
              )}
            </AutoSizer>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, subtitle, trend }) => (
  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-slate-400">{title}</span>
      <div className="p-2 bg-slate-800 rounded-lg">
        {icon}
      </div>
    </div>
    <div className="flex flex-col">
      <span className={`text-2xl font-bold ${trend === 'bad' ? 'text-rose-400' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-slate-500 mt-1">{subtitle}</span>
    </div>
  </div>
);

export default Dashboard;