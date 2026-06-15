import { useEffect, useMemo, useState } from 'react';
import { fetchAvailableModels } from '../hooks/useMatchWebSocket';

const DEFAULT_MODELS = {
  suggested_models: {
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'],
    gemini: ['gemma-4-31b-it', 'gemini-2.5-flash'],
  },
};

function buildOptions(models) {
  const options = [];
  const suggested = models?.suggested_models || DEFAULT_MODELS.suggested_models;
  for (const [provider, names] of Object.entries(suggested)) {
    for (const name of names) {
      options.push({
        value: `${provider}/${name}`,
        label: `${provider.toUpperCase()} - ${name}`,
      });
    }
  }
  return options;
}

export default function MatchControls({ onStart, onStop, isRunning }) {
  const [whiteModel, setWhiteModel] = useState('groq/openai/gpt-oss-120b');
  const [blackModel, setBlackModel] = useState('groq/llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(0.7);
  const [models, setModels] = useState(DEFAULT_MODELS);

  useEffect(() => {
    fetchAvailableModels().then(setModels);
  }, []);

  const modelOptions = useMemo(() => buildOptions(models), [models]);

  return (
    <section className="controls-card">
      <div className="section-heading">
        <span>Match Setup</span>
      </div>

      <label className="field-label" htmlFor="white-model-select">
        White Model
      </label>
      <select
        id="white-model-select"
        className="select-input"
        value={whiteModel}
        onChange={(event) => setWhiteModel(event.target.value)}
        disabled={isRunning}
      >
        {modelOptions.map((option) => (
          <option key={`white-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor="black-model-select">
        Black Model
      </label>
      <select
        id="black-model-select"
        className="select-input"
        value={blackModel}
        onChange={(event) => setBlackModel(event.target.value)}
        disabled={isRunning}
      >
        {modelOptions.map((option) => (
          <option key={`black-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="temperature-row">
        <label className="field-label" htmlFor="temperature-slider">
          Temperature
        </label>
        <strong>{temperature.toFixed(1)}</strong>
      </div>
      <input
        id="temperature-slider"
        className="range-input"
        type="range"
        min="0"
        max="1.5"
        step="0.1"
        value={temperature}
        onChange={(event) => setTemperature(Number(event.target.value))}
        disabled={isRunning}
      />

      {!isRunning ? (
        <button
          className="primary-button"
          type="button"
          onClick={() => onStart(whiteModel, blackModel, temperature)}
        >
          ▶ Start Match
        </button>
      ) : (
        <button className="danger-button" type="button" onClick={onStop}>
          ■ Stop Match
        </button>
      )}
    </section>
  );
}
