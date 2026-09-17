import React, { useState } from 'react';

export default function MemoryInspector({ memories = [], onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // Avvia la modifica inline
  const handleStartEdit = (memory) => {
    setEditingId(memory.id);
    setEditFormData({ ...memory });
  };

  const handleInputChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  // Chiamata API: PUT /api/memories/{id}
  const handleSaveEdit = async (id) => {
    setLoadingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editFormData.type,
          content: editFormData.content,
          source: editFormData.source,
          authority_level: editFormData.authority_level,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Aggiornamento della memoria non riuscito');
      }

      setEditingId(null);
      if (onRefresh) onRefresh(); // Ricarica lo stato nel componente padre
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  // Chiamata API: DELETE /api/memories/{id}
  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa voce di memoria?')) return;

    setLoadingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Eliminazione della memoria non riuscita');
      }

      if (onRefresh) onRefresh(); // Ricarica lo stato nel componente padre
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Pannello Ispezione Memoria</h2>
        <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full border border-indigo-100">
          Voci Totali: {memories.length}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <th className="p-3">Stato</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Contenuto</th>
              <th className="p-3">Fonte</th>
              <th className="p-3">Autorità</th>
              <th className="p-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {memories.map((m) => {
              const isEditing = editingId === m.id;
              const isLoading = loadingId === m.id;

              return (
                <tr
                  key={m.id}
                  className={
                    m.is_overridden && !isEditing
                      ? 'bg-red-50/40 text-gray-400'
                      : 'hover:bg-gray-50 text-gray-700'
                  }
                >
                  {/* Stato */}
                  <td className="p-3 whitespace-nowrap">
                    {m.is_overridden ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-md">
                        Sovrascritta
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded-md">
                        Attiva
                      </span>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="p-3 font-semibold uppercase text-xs">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.type || ''}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs uppercase"
                        disabled={isLoading}
                      />
                    ) : (
                      m.type
                    )}
                  </td>

                  {/* Contenuto */}
                  <td className={`p-3 max-w-xs ${!isEditing && m.is_overridden ? 'line-through' : ''}`}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.content || ''}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                        disabled={isLoading}
                      />
                    ) : (
                      <span className="truncate block" title={m.content}>
                        {m.content}
                      </span>
                    )}
                  </td>

                  {/* Fonte */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.source || ''}
                        onChange={(e) => handleInputChange('source', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                        disabled={isLoading}
                      />
                    ) : (
                      m.source
                    )}
                  </td>

                  {/* Livello Autorità */}
                  <td className="p-3 font-mono font-bold text-indigo-600">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={editFormData.authority_level || 0}
                        onChange={(e) => handleInputChange('authority_level', parseFloat(e.target.value))}
                        className="w-20 border rounded px-2 py-1 text-xs font-mono"
                        disabled={isLoading}
                      />
                    ) : (
                      m.authority_level
                    )}
                  </td>

                  {/* Colonna Azioni */}
                  <td className="p-3 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(m.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {isLoading ? 'Salvataggio...' : 'Salva'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 rounded transition font-medium"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded transition font-medium"
                        >
                          {isLoading ? 'Eliminazione...' : 'Elimina'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}