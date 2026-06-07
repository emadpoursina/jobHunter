import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const DEFAULT_COLLECTOR_CONFIG = {
  enabled: false,
  queries: [],
  location: '',
  maxResults: 10,
};

// Merge stored collector config with defaults for the settings form
function normalizeCollectorConfig(stored) {
  return {
    ...DEFAULT_COLLECTOR_CONFIG,
    ...stored,
    queries: Array.isArray(stored?.queries) ? stored.queries : [],
    maxResults: stored?.maxResults ?? 10,
  };
}

// Build the full settings payload sent to PUT /api/settings
function buildSettingsPayload(form, anthropicApiKey) {
  return {
    llm_provider: form.llmProvider,
    ollama_base_url: form.ollamaBaseUrl,
    ollama_model: form.ollamaModel,
    anthropic_api_key: anthropicApiKey,
    collectors: form.collectors,
  };
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingOllama, setTestingOllama] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [collectorDefs, setCollectorDefs] = useState([]);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({
    llmProvider: 'ollama',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: '',
    anthropicApiKeySet: false,
    collectors: {},
  });
  const [anthropicApiKey, setAnthropicApiKey] = useState('');

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Load settings and collector definitions on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ settings }, { collectors }] = await Promise.all([
          api.getSettings(),
          api.getCollectors(),
        ]);

        if (cancelled) return;

        const mergedCollectors = {};
        for (const collector of collectors) {
          mergedCollectors[collector.name] = normalizeCollectorConfig(
            settings.collectors?.[collector.name],
          );
        }

        setCollectorDefs(collectors);
        setForm({
          llmProvider: settings.llm_provider ?? 'ollama',
          ollamaBaseUrl: settings.ollama_base_url ?? 'http://localhost:11434',
          ollamaModel: settings.ollama_model ?? '',
          anthropicApiKeySet: Boolean(settings.anthropic_api_key_set),
          collectors: mergedCollectors,
        });

        if ((settings.llm_provider ?? 'ollama') === 'ollama') {
          await loadOllamaModels();
        }
      } catch (err) {
        if (!cancelled) showAlert(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  // Fetch available Ollama models for the dropdown
  async function loadOllamaModels() {
    try {
      const { models } = await api.getOllamaModels();
      setOllamaModels(models ?? []);
      return models ?? [];
    } catch (err) {
      setOllamaModels([]);
      throw err;
    }
  }

  // Refresh the Ollama model list
  async function handleRefreshModels() {
    setRefreshingModels(true);
    setAlert(null);
    try {
      const models = await loadOllamaModels();
      showAlert(`Found ${models.length} model(s).`, 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setRefreshingModels(false);
    }
  }

  // Save current settings to the API
  async function handleSave() {
    setSaving(true);
    setAlert(null);
    try {
      const payload = buildSettingsPayload(form, anthropicApiKey);
      const { settings } = await api.saveSettings(payload);

      setForm((prev) => ({
        ...prev,
        llmProvider: settings.llm_provider,
        ollamaBaseUrl: settings.ollama_base_url,
        ollamaModel: settings.ollama_model,
        anthropicApiKeySet: Boolean(settings.anthropic_api_key_set),
        collectors: settings.collectors ?? prev.collectors,
      }));
      setAnthropicApiKey('');
      showAlert('Settings saved.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Save settings then verify Ollama connectivity
  async function handleSaveAndTestOllama() {
    setTestingOllama(true);
    setAlert(null);
    try {
      const payload = buildSettingsPayload(form, anthropicApiKey);
      const { settings } = await api.saveSettings(payload);

      setForm((prev) => ({
        ...prev,
        llmProvider: settings.llm_provider,
        ollamaBaseUrl: settings.ollama_base_url,
        ollamaModel: settings.ollama_model,
        anthropicApiKeySet: Boolean(settings.anthropic_api_key_set),
      }));
      setAnthropicApiKey('');

      const models = await loadOllamaModels();
      showAlert(`Connected to Ollama — ${models.length} model(s) available.`, 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setTestingOllama(false);
    }
  }

  // Update a single collector config field
  function updateCollector(name, field, value) {
    setForm((prev) => ({
      ...prev,
      collectors: {
        ...prev.collectors,
        [name]: {
          ...prev.collectors[name],
          [field]: value,
        },
      },
    }));
  }

  if (loading) {
    return (
      <div>
        <h1>Settings</h1>
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Settings</h1>
      <p className="subtitle">Configure LLM provider and collectors.</p>

      <div className="card">
        <div className="card-title">LLM Provider</div>

        <div className="tabs">
          <button
            type="button"
            className={`tab${form.llmProvider === 'ollama' ? ' active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, llmProvider: 'ollama' }))}
          >
            Ollama (local)
          </button>
          <button
            type="button"
            className={`tab${form.llmProvider === 'anthropic' ? ' active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, llmProvider: 'anthropic' }))}
          >
            Anthropic API
          </button>
        </div>

        {form.llmProvider === 'ollama' ? (
          <>
            <div className="field">
              <label htmlFor="ollama-url">Ollama base URL</label>
              <input
                id="ollama-url"
                type="text"
                value={form.ollamaBaseUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ollamaBaseUrl: e.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="ollama-model">Model</label>
              <div className="btn-actions" style={{ marginTop: 0, marginBottom: 8 }}>
                <select
                  id="ollama-model"
                  value={form.ollamaModel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ollamaModel: e.target.value }))
                  }
                  style={{ flex: 1 }}
                >
                  <option value="">Select a model…</option>
                  {ollamaModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={handleRefreshModels}
                  disabled={refreshingModels}
                >
                  {refreshingModels ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {ollamaModels.length === 0 && (
                <p className="hint">
                  No models loaded. Click Refresh if Ollama is running.
                </p>
              )}
            </div>

            <div className="btn-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAndTestOllama}
                disabled={testingOllama || saving}
              >
                {testingOllama ? 'Testing…' : 'Save & test'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="anthropic-key">Anthropic API key</label>
              <input
                id="anthropic-key"
                type="password"
                placeholder={
                  form.anthropicApiKeySet ? 'Key is set — enter new key to replace' : 'sk-ant-…'
                }
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
              {form.anthropicApiKeySet && (
                <p className="hint">Leave blank to keep the existing key.</p>
              )}
            </div>

            <div className="btn-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Collectors</div>

        {collectorDefs.map((collector) => {
          const config = form.collectors[collector.name] ?? DEFAULT_COLLECTOR_CONFIG;

          return (
            <div key={collector.name} className="collector-card">
              <div className="toggle-row">
                <h3>{collector.label}</h3>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(config.enabled)}
                    onChange={(e) =>
                      updateCollector(collector.name, 'enabled', e.target.checked)
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {config.enabled && (
                <>
                  <div className="field">
                    <label htmlFor={`${collector.name}-queries`}>Search queries</label>
                    <textarea
                      id={`${collector.name}-queries`}
                      rows={3}
                      placeholder="One query per line, e.g. backend engineer Berlin"
                      value={(config.queries ?? []).join('\n')}
                      onChange={(e) =>
                        updateCollector(
                          collector.name,
                          'queries',
                          e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                    <p className="hint">{collector.configSchema.queries?.description}</p>
                  </div>

                  <div className="field">
                    <label htmlFor={`${collector.name}-location`}>Location</label>
                    <input
                      id={`${collector.name}-location`}
                      type="text"
                      placeholder="e.g. Germany"
                      value={config.location ?? ''}
                      onChange={(e) =>
                        updateCollector(collector.name, 'location', e.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`${collector.name}-max`}>Max results per query</label>
                    <input
                      id={`${collector.name}-max`}
                      type="number"
                      min={1}
                      max={50}
                      value={config.maxResults ?? 10}
                      onChange={(e) =>
                        updateCollector(
                          collector.name,
                          'maxResults',
                          Number(e.target.value) || 10,
                        )
                      }
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div className="btn-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
