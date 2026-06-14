import { useState, useEffect } from 'react';
import { fetchAvailableModels } from '../hooks/useMatchWebSocket';

/**
 * Match configuration controls — model selection, temperature, start/stop.
 */
export default function MatchControls({ onStart, onStop, isRunning }) {
  const [whiteModel, setWhiteModel] = useState('groq/llama-3.3-70b-versatile');
  const [blackModel, setBlackModel] = useState('gemini/gemma-4-31b-it');
  const [temperature, setTemperature] = useState(0.7);
  const [models, setModels] = useState(null);

  useEffect(() => {
    fetchAvailableModels().then(setModels);
  }, []);

  // Build the options list from API data
  const modelOptions = [];
  if (models?.suggested_models) {
    for (const [provider, names] of Object.entries(models.suggested_models)) {
      for (const name of names) {
        modelOptions.push({
          value: `${provider}/${name}`,
          label: `${name}`,
          provider,
        });
      }
    }
  }

  const handleStart = () => {
    if (whiteModel && blackModel) {
      onStart(whiteModel, blackModel, temperature);
    }
  };

  return (
    <div className="match-controls glass-card">
      <h3>⚔ Match Setup</h3>

      {/* White model selector */}
      <div className="form-group">
        <label className="form-label" style={{ color: 'var(--white-accent-light)' }}>
          ♔ White Player
        </label>
        <select
          id="white-model-select"
          className="form-select"
          value={whiteModel}
          onChange={(e) => setWhiteModel(e.target.value)}
          disabled={isRunning}
        >
          {modelOptions.map((opt) => (
            <option key={`w-${opt.value}`} value={opt.value}>
              [{opt.provider}] {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Black model selector */}
      <div className="form-group">
        <label className="form-label" style={{ color: 'var(--black-accent-light)' }}>
          ♚ Black Player
        </label>
        <select
          id="black-model-select"
          className="form-select"
          value={blackModel}
          onChange={(e) => setBlackModel(e.target.value)}
          disabled={isRunning}
        >
          {modelOptions.map((opt) => (
            <option key={`b-${opt.value}`} value={opt.value}>
              [{opt.provider}] {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div className="slider-group">
        <div className="slider-header">
          <label className="form-label">Temperature</label>
          <span className="slider-value">{temperature.toFixed(1)}</span>
        </div>
        <input
          id="temperature-slider"
          type="range"
          className="range-slider"
          min="0"
          max="1.5"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          disabled={isRunning}
        />
      </div>

      {/* Actions */}
      <div className="controls-actions">
        {!isRunning ? (
          <button
            id="start-match-btn"
            className="btn btn-primary"
            onClick={handleStart}
          >
            ▶ Start Match
          </button>
        ) : (
          <button
            id="stop-match-btn"
            className="btn btn-danger"
            onClick={onStop}
          >
            ■ Stop Match
          </button>
        )}
      </div>
    </div>
  );
}
