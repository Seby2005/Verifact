'use client';

import React, { useState } from 'react';
import type { FixedCost } from '@/types/database';
import styles from './FinancialDashboard.module.css';

interface FixedCostsTableProps {
  initialItems: FixedCost[];
  onCostsChanged: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  hosting: 'Hosting & Serverless',
  ai_tools: 'Unelte AI & API-uri',
  infrastructure: 'Bază de date & Stocare',
  domain: 'Domenii & DNS',
  other: 'Altele',
};

export const FixedCostsTable: React.FC<FixedCostsTableProps> = ({
  initialItems,
  onCostsChanged,
}) => {
  const [items, setItems] = useState<FixedCost[]>(initialItems);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('hosting');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editCategory, setEditCategory] = useState('hosting');
  const [editNote, setEditNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if initialItems update from parent
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(monthlyAmount);
    if (!name.trim()) {
      setErrorMsg('Te rugăm să introduci numele abonamentului.');
      return;
    }
    if (isNaN(amountNum) || amountNum < 0) {
      setErrorMsg('Suma lunară trebuie să fie un număr valid pozitiv.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/financial/fixed-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          monthly_amount: amountNum,
          currency,
          note: note.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Eroare la adăugarea costului fix.');
        setSubmitting(false);
        return;
      }

      setItems([data.fixedCost, ...items]);
      setName('');
      setMonthlyAmount('');
      setNote('');
      setIsAdding(false);
      setSuccessMsg('Costul fix a fost adăugat cu succes.');
      onCostsChanged();
    } catch {
      setErrorMsg('Eroare de rețea. Reîncearcă.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: FixedCost) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(String(item.monthly_amount));
    setEditCurrency(item.currency || 'EUR');
    setEditCategory(item.category || 'other');
    setEditNote(item.note || '');
  };

  const saveEdit = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(editAmount);
    if (!editName.trim()) {
      setErrorMsg('Numele nu poate fi gol.');
      return;
    }
    if (isNaN(amountNum) || amountNum < 0) {
      setErrorMsg('Suma trebuie să fie un număr pozitiv.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/financial/fixed-costs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          monthly_amount: amountNum,
          currency: editCurrency,
          note: editNote.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Eroare la actualizarea costului.');
        setSubmitting(false);
        return;
      }

      setItems(items.map((i) => (i.id === id ? data.fixedCost : i)));
      setEditingId(null);
      setSuccessMsg('Costul a fost actualizat.');
      onCostsChanged();
    } catch {
      setErrorMsg('Eroare de rețea.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!window.confirm(`Ești sigur că vrei să ștergi costul "${itemName}"?`)) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/financial/fixed-costs/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Eroare la ștergerea costului.');
        return;
      }

      setItems(items.filter((i) => i.id !== id));
      setSuccessMsg(`Costul "${itemName}" a fost șters.`);
      onCostsChanged();
    } catch {
      setErrorMsg('Eroare de rețea la ștergere.');
    }
  };

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.cardBox}>
        <div className={styles.cardBoxHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Costuri Fixe Recurente (Abonamente & Infrastructură)</h3>
            <p className={styles.sectionSubtitle}>
              Introduse manual de administrator (Claude, Vercel, Supabase, domenii etc.).
            </p>
          </div>
          <button
            type="button"
            className={styles.btnPrimarySmall}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? 'Anulează' : '+ Adaugă Cost Fix'}
          </button>
        </div>

        {errorMsg && (
          <div className={`${styles.statusMessage} ${styles.statusMessageError}`}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className={`${styles.statusMessage} ${styles.statusMessageSuccess}`}>
            {successMsg}
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleAdd} className={styles.formInline}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Nume Serviciu / Abonament</label>
              <input
                type="text"
                placeholder="ex: Vercel Pro, Domeniu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Categorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.formSelect}
              >
                <option value="hosting">Hosting & Serverless</option>
                <option value="infrastructure">Bază de date & Stocare</option>
                <option value="ai_tools">Unelte AI & Dezvoltare</option>
                <option value="domain">Domenii & DNS</option>
                <option value="other">Altele</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Sumă Lunară</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="20.00"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Monedă</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={styles.formSelect}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="RON">RON (lei)</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Notă / Descriere (opțional)</label>
              <input
                type="text"
                placeholder="ex: Facturat lunar"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={styles.formInput}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className={styles.btnPrimarySmall}
              >
                {submitting ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </form>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Serviciu</th>
                <th>Categorie</th>
                <th>Sumă Lunară</th>
                <th>Monedă</th>
                <th>Notă</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Niciun cost fix înregistrat momentan. Apasă pe "+ Adaugă Cost Fix" pentru a adăuga primul abonament.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id}>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className={styles.formInput}
                            />
                          </td>
                          <td>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className={styles.formSelect}
                            >
                              <option value="hosting">Hosting</option>
                              <option value="infrastructure">Infrastructură</option>
                              <option value="ai_tools">Unelte AI</option>
                              <option value="domain">Domeniu</option>
                              <option value="other">Altele</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className={styles.tableInputNumber}
                            />
                          </td>
                          <td>
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              className={styles.formSelect}
                            >
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                              <option value="RON">RON</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className={styles.formInput}
                            />
                          </td>
                          <td>
                            <div className={styles.actionButtonGroup}>
                              <button
                                type="button"
                                disabled={submitting}
                                className={styles.btnPrimarySmall}
                                onClick={() => saveEdit(item.id)}
                              >
                                Salvează
                              </button>
                              <button
                                type="button"
                                className={styles.btnSecondarySmall}
                                onClick={() => setEditingId(null)}
                              >
                                Anulează
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>
                            <span className={styles.categoryTag}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                          </td>
                          <td>
                            <strong>
                              {Number(item.monthly_amount).toFixed(2)}
                            </strong>
                          </td>
                          <td>{item.currency}</td>
                          <td>{item.note || '—'}</td>
                          <td>
                            <div className={styles.actionButtonGroup}>
                              <button
                                type="button"
                                className={styles.btnSecondarySmall}
                                onClick={() => startEdit(item)}
                              >
                                Editează
                              </button>
                              <button
                                type="button"
                                className={styles.btnDangerSmall}
                                onClick={() => handleDelete(item.id, item.name)}
                              >
                                Șterge
                              </button>
                            </div>
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
