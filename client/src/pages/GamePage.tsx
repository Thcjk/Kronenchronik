import { useState, useEffect } from 'react';
import { api, type GameState, type Province, type BattleResult } from '../api/client';
import ResourceBar from '../components/ResourceBar';
import WorldMap from '../components/WorldMap';
import ProvincePanel from '../components/ProvincePanel';

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGame();
  }, []);

  const loadGame = async () => {
    try {
      const state = await api.getGameState();
      setGameState(state);
      if (!selectedProvince && state.provinces.length > 0) {
        const owned = state.provinces.find((p) => p.isOwned);
        if (owned) setSelectedProvince(owned);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spielstand konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (province: Province) => {
    setSelectedProvince(province);
    setBattleResult(null);
  };

  const handleUpdate = (state: GameState) => {
    setGameState(state);
    if (selectedProvince) {
      const updated = state.provinces.find((p) => p.id === selectedProvince.id);
      if (updated) setSelectedProvince(updated);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-medieval-gold animate-pulse py-20">Welt wird geladen...</div>
    );
  }

  if (error || !gameState) {
    return <div className="text-center text-red-400 py-20">{error || 'Kein Spielstand'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-medieval-gold">{gameState.kingdom.name}</h2>
          <ResourceBar resources={gameState.kingdom.resources} />
        </div>
      </div>

      {battleResult && (
        <div
          className={`card border-2 ${battleResult.attackerWon ? 'border-medieval-gold' : 'border-medieval-red'}`}
        >
          <h3 className="font-bold text-lg mb-2">
            {battleResult.attackerWon ? '⚔️ Sieg!' : '🛡️ Niederlage'}
          </h3>
          <p className="text-sm mb-2">{battleResult.summary}</p>
          <div className="text-xs space-y-1 text-gray-400">
            {battleResult.rounds.map((r) => (
              <div key={r.round}>{r.description}</div>
            ))}
          </div>
          <button onClick={() => setBattleResult(null)} className="btn-secondary text-xs mt-2">
            Schließen
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WorldMap
            provinces={gameState.provinces}
            selectedId={selectedProvince?.id ?? null}
            onSelect={handleSelect}
          />
        </div>
        <div>
          {selectedProvince ? (
            <ProvincePanel
              province={selectedProvince}
              gameState={gameState}
              onUpdate={handleUpdate}
              onBattleResult={setBattleResult}
            />
          ) : (
            <div className="card text-center text-gray-400 py-10">
              Wähle eine Provinz auf der Karte
            </div>
          )}
        </div>
      </div>

      {gameState.recentBattles.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-medieval-gold mb-3">Letzte Schlachten</h3>
          <div className="space-y-2">
            {gameState.recentBattles.map((b) => (
              <div key={b.id} className="text-sm bg-medieval-dark p-2 rounded flex justify-between">
                <span>
                  {b.attacker.name} vs {b.defender?.name ?? 'Neutral'} in {b.province.name}
                </span>
                <span className={b.attackerWon ? 'text-medieval-gold' : 'text-medieval-red'}>
                  {b.attackerWon ? 'Sieg' : 'Niederlage'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
