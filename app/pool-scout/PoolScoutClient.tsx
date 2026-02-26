'use client';

import { useMemo, useState } from 'react';

type Opponent = {
  id: string;
  name: string;
  club: string | null;
  rating: string | null;
  birthYear: number | null;
  opponentLink: { fencingTrackerId: string; fencingTrackerUrl: string } | null;
};

type PoolImport = {
  id: string;
  ftlPoolLink: string;
  kValue: number;
  opponents: Opponent[];
};

export function PoolScoutClient({ initialPoolImport }: { initialPoolImport: PoolImport | null }) {
  const [ftlPoolLink, setFtlPoolLink] = useState(initialPoolImport?.ftlPoolLink ?? '');
  const [rosterRaw, setRosterRaw] = useState('');
  const [poolImport, setPoolImport] = useState<PoolImport | null>(initialPoolImport);
  const [kValue, setKValue] = useState(initialPoolImport?.kValue ?? 300);
  const [probs, setProbs] = useState<Record<string, { pPool: number | null; pDe: number | null }>>({});

  const parsedPreview = useMemo(() => {
    return rosterRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')))
      .map((parts) => ({
        name: (parts[0] || '').trim(),
        club: (parts[1] || '').trim(),
        rating: (parts[2] || '').trim(),
        birth_year: (parts[3] || '').trim(),
      }))
      .filter((row) => row.name);
  }, [rosterRaw]);

  async function createImport() {
    const response = await fetch('/api/pool-scout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ftlPoolLink, rosterRaw, kValue }),
    });
    const data = await response.json();
    window.location.href = `/pool-scout?poolImportId=${data.id}`;
  }

  async function updateCell(opponentRawId: string, field: string, value: string) {
    await fetch('/api/pool-scout/update-cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentRawId, field, value }),
    });
  }

  async function saveLink(opponentRawId: string, profileInput: string) {
    await fetch('/api/pool-scout/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentRawId, profileInput }),
    });
    window.location.reload();
  }

  async function compute() {
    if (!poolImport) return;
    const response = await fetch('/api/pool-scout/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolImportId: poolImport.id, kValue }),
    });
    const data = await response.json();
    const map: Record<string, { pPool: number | null; pDe: number | null }> = {};
    for (const row of data.rows) {
      map[row.opponentRawId] = { pPool: row.pPool, pDe: row.pDe };
    }
    setProbs(map);
  }

  return (
    <main>
      <h1>Pool Scout</h1>
      <label>FTL Pool Link</label>
      <input value={ftlPoolLink} onChange={(e) => setFtlPoolLink(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      <label>Roster Paste</label>
      <textarea
        value={rosterRaw}
        onChange={(e) => setRosterRaw(e.target.value)}
        rows={6}
        placeholder="name, club, rating, birth_year"
        style={{ width: '100%', marginBottom: 12 }}
      />
      <div className="small">Parsed preview before import:</div>
      <table style={{ marginBottom: 12 }}>
        <thead><tr><th>Name</th><th>Club</th><th>Rating</th><th>Birth Year</th></tr></thead>
        <tbody>
          {parsedPreview.map((row, idx) => (
            <tr key={idx}><td>{row.name}</td><td>{row.club}</td><td>{row.rating}</td><td>{row.birth_year}</td></tr>
          ))}
        </tbody>
      </table>
      <button onClick={createImport}>Import Roster</button>

      {poolImport ? (
        <>
          <h2 style={{ marginTop: 24 }}>Imported Opponents</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>k</label>
            <input type="number" value={kValue} onChange={(e) => setKValue(Number(e.target.value) || 300)} />
            <button onClick={compute}>Compute Probabilities</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Club</th><th>Rating</th><th>Birth Year</th><th>Resolve FencingTracker</th><th>P_pool</th><th>P_de</th>
              </tr>
            </thead>
            <tbody>
              {poolImport.opponents.map((opp) => (
                <tr key={opp.id}>
                  <td><input defaultValue={opp.name} onBlur={(e) => updateCell(opp.id, 'name', e.target.value)} /></td>
                  <td><input defaultValue={opp.club ?? ''} onBlur={(e) => updateCell(opp.id, 'club', e.target.value)} /></td>
                  <td><input defaultValue={opp.rating ?? ''} onBlur={(e) => updateCell(opp.id, 'rating', e.target.value)} /></td>
                  <td><input defaultValue={opp.birthYear ?? ''} onBlur={(e) => updateCell(opp.id, 'birthYear', e.target.value)} /></td>
                  <td>
                    <ResolveCell
                      current={opp.opponentLink?.fencingTrackerUrl ?? opp.opponentLink?.fencingTrackerId ?? ''}
                      onSave={(value) => saveLink(opp.id, value)}
                    />
                  </td>
                  <td>{probs[opp.id]?.pPool != null ? probs[opp.id].pPool.toFixed(3) : '-'}</td>
                  <td>{probs[opp.id]?.pDe != null ? probs[opp.id].pDe.toFixed(3) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </main>
  );
}

function ResolveCell({ current, onSave }: { current: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(current);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Profile URL or ID" />
      <button onClick={() => onSave(value)}>Confirm</button>
    </div>
  );
}
