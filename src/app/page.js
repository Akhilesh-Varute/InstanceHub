'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Power, PowerOff, Server, Clock, Info, RefreshCw } from 'lucide-react';

export default function Home() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    setLogs(prevLogs => [{
      message,
      type,
      timestamp
    }, ...prevLogs].slice(0, 100));
  };

  const fetchInstances = async () => {
    try {
      setRefreshing(true);
      addLog('Fetching instances...');
      const response = await fetch('/api/aws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });

      if (!response.ok) throw new Error('Failed to fetch instances');

      const data = await response.json();
      setInstances(data);
      addLog(`Successfully fetched ${data.length} instances`, 'success');
    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInstanceAction = async (instanceId, action, instanceName) => {
    try {
      addLog(`Attempting to ${action} instance ${instanceName} (${instanceId})...`);
      const response = await fetch('/api/aws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, instanceId }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} instance`);

      addLog(`Successfully initiated ${action} for instance ${instanceName}`, 'success');
      await fetchInstances();
    } catch (err) {
      setError(err.message);
      addLog(`Error: Failed to ${action} instance - ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (state) => {
    switch (state) {
      case 'running': return 'bg-emerald-500';
      case 'stopped': return 'bg-rose-500';
      case 'pending': return 'bg-amber-500';
      case 'stopping': return 'bg-orange-500';
      default: return 'bg-slate-500';
    }
  };

  const getInstanceStats = () => {
    const stats = instances.reduce((acc, instance) => {
      acc[instance.state] = (acc[instance.state] || 0) + 1;
      return acc;
    }, {});
    return stats;
  };

  const filteredInstances = instances.filter(instance =>
    instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-white shadow-lg">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-xl font-semibold text-slate-700">Loading instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">EC2 Instance Manager</h1>
            <p className="text-slate-500 mt-1">Manage your AWS EC2 instances</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search instances..."
                className="pl-10 pr-4 py-2 border rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            <Button
              onClick={fetchInstances}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2 bg-white/50 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(getInstanceStats()).map(([state, count]) => (
            <Card key={state} className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs font-semibold text-slate-500">
                  {state} Instances
                </CardDescription>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold text-slate-800">{count}</CardTitle>
                  <Badge className={`${getStatusColor(state)} text-white`}>{state}</Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="instances" className="space-y-4">
          <TabsList className="bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="instances" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Instances
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instances">
            <div className="grid gap-4">
              {filteredInstances.map((instance) => (
                <Card key={instance.id} className="bg-white/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-slate-800">{instance.name}</h2>
                          <Badge variant="outline" className="font-mono bg-white/50">{instance.type}</Badge>
                          <Badge className={`${getStatusColor(instance.state)} text-white animate-pulse`}>
                            {instance.state}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500 space-y-1">
                          <p className="flex items-center gap-1">
                            <Info className="w-4 h-4" />
                            <span className="font-mono">{instance.id}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Last Updated: {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {instance.state === 'stopped' && (
                          <Button
                            onClick={() => handleInstanceAction(instance.id, 'start', instance.name)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <Power className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        )}
                        {instance.state === 'running' && (
                          <Button
                            onClick={() => handleInstanceAction(instance.id, 'stop', instance.name)}
                            variant="destructive"
                            className="bg-rose-500 hover:bg-rose-600"
                          >
                            <PowerOff className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`mb-2 p-3 rounded-lg border ${
                        log.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                        log.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-xs text-slate-500 block mb-1">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <p className="text-sm">{log.message}</p>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}