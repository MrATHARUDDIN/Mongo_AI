import React, { useState, useEffect } from 'react';

export default function MemoryForm({ onMemoryAdded }) {
  const [activeMemories, setActiveMemories] = useState([]);
  const [formData, setFormData] = useState({
    type: 'rule',
    content: '',
    authority_level: 5.0,
    source: '',
    replaces_id: ''
  });

  // Carica le memorie attive esistenti per popolare il menu a tendina 'replaces_id'
  useEffect(() => {
    fetch('/api/memories?include_overridden=false')
      .then((res) => res.json())
      .then((data) => setActiveMemories(data))
      .catch(console.error);
  }, [onMemoryAdded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, authority_level: parseFloat(formData.authority_level) };
    if (!payload.replaces_id) delete payload.replaces_id;

    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setFormData({ type: 'rule', content: '', authority_level: 5.0, source: '', replaces_id: '' });
    onMemoryAdded();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Inserisci Conoscenza e Regole</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-indigo-500"
          >
            <option value="fact">Fatto</option>
            <option value="correction">Correzione</option>
            <option value="rule">Regola</option>
            <option value="exception">Eccezione</option>
            <option value="decision">Decisione</option>
            <option value="assumption">Ipotesi</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Contenuto</label>
          <textarea
            required
            rows={3}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-indigo-500"
            placeholder="es. Escludi gli account inattivi dai calcoli della posizione commerciale."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Fonte</label>
          <input
            type="text"
            required
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-indigo-500"
            placeholder="es. Consiglio di Amministrazione / Osservazione sul campo"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">
            Peso Autorità: <span className="font-bold text-indigo-600">{formData.authority_level}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={formData.authority_level}
            onChange={(e) => setFormData({ ...formData, authority_level: e.target.value })}
            className="w-full mt-1 accent-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Sostituisce Memoria (Opzionale)</label>
          <select
            value={formData.replaces_id}
            onChange={(e) => setFormData({ ...formData, replaces_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-indigo-500"
          >
            <option value="">Nessuna (Nuova Voce di Conoscenza)</option>
            {activeMemories.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.type.toUpperCase()}] {m.content.substring(0, 35)}...
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Salva nella Memoria Agente
        </button>
      </form>
    </div>
  );
}