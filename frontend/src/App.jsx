import React, { useState, useEffect } from 'react';
import MemoryForm from './components/MemoryForm';
import MemoryInspector from './components/MemoryInspector';
import AgentSandbox from './components/AgentSandbox';

export default function App() {
  const [memories, setMemories] = useState([]);

  const refreshMemories = () => {
    fetch('/api/memories?include_overridden=true')
      .then((res) => res.json())
      .then((data) => setMemories(data))
      .catch(console.error);
  };

  useEffect(() => {
    refreshMemories();
  }, []);

  // Gestore passato a MemoryForm quando viene creata una nuova memoria
  const handleMemoryAdded = (newMemory) => {
    if (newMemory && newMemory.id) {
      setMemories((prev) => [newMemory, ...prev]);
    } else {
      refreshMemories();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-900">
      <header className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Gestione della Conoscenza Agente
        </h1>
        <p className="text-sm text-gray-600">
          Consultazione dinamica della memoria, sovrascrizioni ed esecuzione di query basate sullo schema.
        </p>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <MemoryForm onMemoryAdded={handleMemoryAdded} />
          <div className="lg:col-span-2">
            <MemoryInspector memories={memories} onRefresh={refreshMemories} />
          </div>
        </div>
        <AgentSandbox />
      </main>
    </div>
  );
}