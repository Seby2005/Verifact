'use client';

import React, { useState } from 'react';
import type { ApiPricing } from '@/types/database';
import styles from './FinancialDashboard.module.css';

interface ApiPricingTableProps {
  initialPricing: ApiPricing[];
  onPricingChanged: () => void;
}

export const ApiPricingTable: React.FC<ApiPricingTableProps> = ({
  initialPricing,
  onPricingChanged,
}) => {
  const [pricingList, setPricingList] = useState<ApiPricing[]>(initialPricing);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editInputPrice, setEditInputPrice] = useState<string>('');
  const [editOutputPrice, setEditOutputPrice] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('USD');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New model state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProvider, setNewProvider] = useState('gemini');
  const [newModel, setNewModel] = useState('');
  const [newInputPrice, setNewInputPrice] = useState('');
  const [newOutputPrice, setNewOutputPrice] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');

  React.useEffect(() => {
    setPricingList(initialPricing);
  }, [initialPricing]);

  const startEdit = (p: ApiPricing) => {
    setEditingModel(p.model);
    setEditInputPrice(String(p.price_per_million_input_tokens));
    setEditOutputPrice(String(p.price_per_million_output_tokens));
    setEditCurrency(p.currency || 'USD');
  };

  const savePricing = async (p: ApiPricing) => {
    setStatusMsg(null);
    const inPrice = parseFloat(editInputPrice);
    const outPrice = parseFloat(editOutputPrice);

    if (isNaN(inPrice) || inPrice < 0 || isNaN(outPrice) || outPrice < 0) {
      setStatusMsg({ type: 'error', text: 'Prețurile per milion de tokeni trebuie să fie numere valide pozitive.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/financial/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: p.provider,
          model: p.model,
          price_per_million_input_tokens: inPrice,
          price_per_million_output_tokens: outPrice,
          currency: editCurrency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Eroare la actualizarea tarifului.' });
        setSaving(false);
        return;
      }

      setPricingList(pricingList.map((item) => (item.model === p.model ? data.pricing : item)));
      setEditingModel(null);
      setStatusMsg({ type: 'success', text: `Tarifele pentru ${p.model} au fost actualizate.` });
      onPricingChanged();
    } catch {
      setStatusMsg({ type: 'error', text: 'Eroare de rețea la salvare.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const inPrice = parseFloat(newInputPrice);
    const outPrice = parseFloat(newOutputPrice);

    if (!newModel.trim()) {
      setStatusMsg({ type: 'error', text: 'Numele modelului este obligatoriu.' });
      return;
    }

    if (isNaN(inPrice) || inPrice < 0 || isNaN(outPrice) || outPrice < 0) {
      setStatusMsg({ type: 'error', text: 'Prețurile per milion de tokeni trebuie să fie pozitive.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/financial/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newProvider,
          model: newModel.trim(),
          price_per_million_input_tokens: inPrice,
          price_per_million_output_tokens: outPrice,
          currency: newCurrency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Eroare la adăugarea tarifului.' });
        setSaving(false);
        return;
      }

      setPricingList([...pricingList.filter((x) => x.model !== data.pricing.model), data.pricing]);
      setIsAddingNew(false);
      setNewModel('');
      setNewInputPrice('');
      setNewOutputPrice('');
      setStatusMsg({ type: 'success', text: `Modelul ${data.pricing.model} a fost configurat.` });
      onPricingChanged();
    } catch {
      setStatusMsg({ type: 'error', text: 'Eroare de rețea.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.cardBox}>
        <div className={styles.cardBoxHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Configurare Prețuri API Tokeni (api_pricing)</h3>
            <p className={styles.sectionSubtitle}>
              Editabil direct din interfață. Modificările se aplică instantaneu la calculul costurilor.
            </p>
          </div>
          <button
            type="button"
            className={styles.btnPrimarySmall}
            onClick={() => setIsAddingNew(!isAddingNew)}
          >
            {isAddingNew ? 'Anulează' : '+ Adaugă Model'}
          </button>
        </div>

        {statusMsg && (
          <div
            className={`${styles.statusMessage} ${
              statusMsg.type === 'error'
                ? styles.statusMessageError
                : styles.statusMessageSuccess
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {isAddingNew && (
          <form onSubmit={handleAddNew} className={styles.formInline}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Provider</label>
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                className={styles.formSelect}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Model ID</label>
              <input
                type="text"
                placeholder="ex: gemini-2.0-flash"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Preț / 1M Input Tokens</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.1000"
                value={newInputPrice}
                onChange={(e) => setNewInputPrice(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Preț / 1M Output Tokens</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.4000"
                value={newOutputPrice}
                onChange={(e) => setNewOutputPrice(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Monedă</label>
              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className={styles.formSelect}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={saving}
                className={styles.btnPrimarySmall}
              >
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </form>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Preț / 1M Input</th>
                <th>Preț / 1M Output</th>
                <th>Monedă</th>
                <th>Ultima Actualizare</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {pricingList.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    Nu sunt modele configurate în baza de date. Se folosesc tarifele standard interne.
                  </td>
                </tr>
              ) : (
                pricingList.map((p) => {
                  const isEditing = editingModel === p.model;
                  return (
                    <tr key={p.model}>
                      <td>
                        <span className={styles.categoryTag}>{p.provider}</span>
                      </td>
                      <td>
                        <strong>{p.model}</strong>
                      </td>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              type="number"
                              step="0.0001"
                              value={editInputPrice}
                              onChange={(e) => setEditInputPrice(e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.0001"
                              value={editOutputPrice}
                              onChange={(e) => setEditOutputPrice(e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          </td>
                          <td>
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              className={styles.formSelect}
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </td>
                          <td>Acum</td>
                          <td>
                            <div className={styles.actionButtonGroup}>
                              <button
                                type="button"
                                disabled={saving}
                                className={styles.btnPrimarySmall}
                                onClick={() => savePricing(p)}
                              >
                                Salvează
                              </button>
                              <button
                                type="button"
                                className={styles.btnSecondarySmall}
                                onClick={() => setEditingModel(null)}
                              >
                                Anulează
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>${Number(p.price_per_million_input_tokens).toFixed(4)}</td>
                          <td>${Number(p.price_per_million_output_tokens).toFixed(4)}</td>
                          <td>{p.currency}</td>
                          <td>
                            {p.updated_at
                              ? new Date(p.updated_at).toLocaleDateString('ro-RO')
                              : 'Standard'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.btnSecondarySmall}
                              onClick={() => startEdit(p)}
                            >
                              Editează
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
