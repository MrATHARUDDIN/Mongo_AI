import React, { useState } from 'react';
import sampleQuestions from './data.json';

export default function AgentSandbox() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleQuery = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const queryToSubmit = customPrompt !== undefined ? customPrompt : prompt;
    if (!queryToSubmit.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: queryToSubmit })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Impossibile elaborare la richiesta dell\'agente');
      }

      setResponse(data);
    } catch (err) {
      console.error('Agent Query Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (question) => {
    setPrompt(question);
    handleQuery(null, question);
  };

  // Determina se la query eseguita corrisponde esattamente alle domande predefinite
  const isPresetQuestion = sampleQuestions?.some(
    (item) => item.question?.trim().toLowerCase() === prompt.trim().toLowerCase()
  );

  // Estrae le intestazioni uniche del dataset restituito (escludendo _id)
  const tableHeaders = response?.data && response.data.length > 0
    ? Array.from(new Set(response.data.flatMap(doc => Object.keys(doc)))).filter(key => key !== '_id')
    : [];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Interfaccia Query Agente</h2>
      
      {/* Barra dei Suggerimenti */}
      {sampleQuestions && sampleQuestions.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">
            Domande Suggerite
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item.question)}
                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition font-medium text-left"
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form di Inserimento Query */}
      <form onSubmit={(e) => handleQuery(e)} className="flex gap-3 mb-6">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Seleziona una domanda suggerita o scrivi una query personalizzata..."
          className="flex-1 rounded-md border-gray-300 border p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Elaborazione...' : 'Invia all\'Agente'}
        </button>
      </form>

      {/* Visualizzazione Errore */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          <strong>Errore:</strong> {error}
        </div>
      )}

      {/* Visualizzazione Risposta */}
      {response && (
        <div className="space-y-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Riepilogo AI in Linguaggio Naturale</h3>
            <p className="text-sm font-medium text-gray-800 mt-1">{response.summary}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Filtro PyMongo Generato</h3>
              {/* Badge visivo sulla modalità di esecuzione */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isPresetQuestion 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {isPresetQuestion ? 'Predefinito Veloce' : 'Traduzione AI Dinamica'}
              </span>
            </div>
            <pre className="bg-gray-900 text-green-400 p-3 rounded-md text-xs font-mono mt-1 overflow-x-auto">
              {JSON.stringify(response.generated_filter, null, 2)}
            </pre>
          </div>

          {/* Sezione Tabella Risultati */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                Risultati Query ({response.raw_results_count || 0} record)
              </h3>
            </div>

            {response.data && response.data.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white max-h-96">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {tableHeaders.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-3 py-2 text-left font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {response.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-indigo-50/40 transition">
                        {tableHeaders.map((header) => (
                          <td
                            key={`${rowIndex}-${header}`}
                            className="px-3 py-2 text-gray-800 whitespace-nowrap font-medium"
                          >
                            {typeof row[header] === 'object' && row[header] !== null
                              ? JSON.stringify(row[header])
                              : String(row[header] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-md border border-gray-200 text-xs text-gray-500 text-center">
                Nessun record corrispondente trovato per questa query.
              </div>
            )}
          </div>

          {/* Contesto Memorie Applicate */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Contesto Memoria Applicato</h3>
            <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-1">
              {response.applied_memories?.map((m, i) => (
                <li key={m.id || i}>
                  <span className="font-semibold uppercase">[{m.type}]</span> {m.content} (Autorità: {m.authority_level})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}