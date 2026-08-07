import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const DEFAULT_COLLECTOR_CONFIG = {
  enabled: false,
  queries: [],
  location: '',
  maxResults: 10,
};

const DEFAULT_LLM_TASK = { provider: '', model: '' };

const LLM_TASK_DEFS = [
  { key: 'parse', label: 'Parse offer' },
  { key: 'cv', label: 'Generate CV' },
];

// Merge stored collector config with defaults for the settings form
function normalizeCollectorConfig(stored) {
  return {
    ...DEFAULT_COLLECTOR_CONFIG,
    ...stored,
    queries: Array.isArray(stored?.queries) ? stored.queries : [],
    maxResults: stored?.maxResults ?? 10,
  };
}

// Normalize per-task LLM overrides from API/settings
function normalizeLlmTasks(stored) {
  const tasks = {};
  for (const { key } of LLM_TASK_DEFS) {
    const entry = stored?.[key] && typeof stored[key] === 'object' ? stored[key] : {};
    tasks[key] = {
      provider: entry.provider ?? '',
      model: entry.model ?? '',
    };
  }
  return tasks;
}

// Build the full settings payload sent to PUT /api/settings
function buildSettingsPayload(form, openaiApiKey, openrouterApiKey) {
  return {
    llm_provider: form.llmProvider,
    openai_api_key: openaiApiKey,
    openai_base_url: form.openaiBaseUrl,
    openai_model: form.openaiModel,
    openrouter_api_key: openrouterApiKey,
    openrouter_model: form.openrouterModel,
    openrouter_provider_order: form.openrouterProviderOrder,
    llm_tasks: form.llmTasks,
    collectors: form.collectors,
  };
}

// Map API settings response onto form state fields
function formFromSettings(settings, collectors) {
  return {
    llmProvider: settings.llm_provider ?? 'openai',
    openaiApiKeySet: Boolean(settings.openai_api_key_set),
    openaiBaseUrl: settings.openai_base_url ?? 'https://api.openai.com/v1',
    openaiModel: settings.openai_model ?? '',
    openrouterApiKeySet: Boolean(settings.openrouter_api_key_set),
    openrouterModel: settings.openrouter_model ?? '',
    openrouterProviderOrder: settings.openrouter_provider_order ?? '',
    llmTasks: normalizeLlmTasks(settings.llm_tasks),
    collectors: collectors ?? settings.collectors ?? {},
  };
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [collectorDefs, setCollectorDefs] = useState([]);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({
    llmProvider: 'openai',
    openaiApiKeySet: false,
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: '',
    openrouterApiKeySet: false,
    openrouterModel: '',
    openrouterProviderOrder: '',
    llmTasks: normalizeLlmTasks(null),
    collectors: {},
  });
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');

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
        setForm(formFromSettings(settings, mergedCollectors));
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

  // Apply saved settings response and clear key inputs
  function applySavedSettings(settings, keepCollectors = true) {
    setForm((prev) =>
      formFromSettings(settings, keepCollectors ? (settings.collectors ?? prev.collectors) : prev.collectors),
    );
    setOpenaiApiKey('');
    setOpenrouterApiKey('');
  }

  // Save current settings to the API
  async function handleSave() {
    setSaving(true);
    setAlert(null);
    try {
      const payload = buildSettingsPayload(form, openaiApiKey, openrouterApiKey);
      const { settings } = await api.saveSettings(payload);
      applySavedSettings(settings);
      showAlert('Settings saved.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Save current form, then ping the active LLM provider
  async function handleTestProvider() {
    setTestingProvider(true);
    setTestResult(null);
    setAlert(null);
    try {
      const payload = buildSettingsPayload(form, openaiApiKey, openrouterApiKey);
      const { settings } = await api.saveSettings(payload);
      applySavedSettings(settings);

      const result = await api.testLlm();
      setTestResult(result);
      showAlert(`Provider OK (${result.provider}).`, 'info');
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
      showAlert(err.message);
    } finally {
      setTestingProvider(false);
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

  // Update one per-task LLM override field
  function updateLlmTask(task, field, value) {
    setForm((prev) => ({
      ...prev,
      llmTasks: {
        ...prev.llmTasks,
        [task]: {
          ...DEFAULT_LLM_TASK,
          ...prev.llmTasks[task],
          [field]: value,
        },
      },
    }));
  }

  // Placeholder for task model input when using Default provider
  function defaultModelHint(taskProvider) {
    const provider = taskProvider || form.llmProvider;
    if (provider === 'openai') return form.openaiModel || 'global OpenAI model';
    if (provider === 'openrouter') return form.openrouterModel || 'global OpenRouter model';
    return 'global model';
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
            className={`tab${form.llmProvider === 'openai' ? ' active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, llmProvider: 'openai' }))}
          >
            OpenAI API
          </button>
          <button
            type="button"
            className={`tab${form.llmProvider === 'openrouter' ? ' active' : ''}`}
            onClick={() => setForm((prev) => ({ ...prev, llmProvider: 'openrouter' }))}
          >
            OpenRouter
          </button>
        </div>

        {form.llmProvider === 'openai' && (
          <>
            <div className="field">
              <label htmlFor="openai-url">API base URL</label>
              <input
                id="openai-url"
                type="text"
                placeholder="https://api.openai.com/v1"
                value={form.openaiBaseUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, openaiBaseUrl: e.target.value }))
                }
              />
              <p className="hint">
                OpenAI-compatible endpoint (OpenAI, Azure, OpenRouter, local proxies, etc.).
              </p>
            </div>

            <div className="field">
              <label htmlFor="openai-key">API key</label>
              <input
                id="openai-key"
                type="password"
                placeholder={
                  form.openaiApiKeySet ? 'Key is set — enter new key to replace' : 'sk-…'
                }
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
              {form.openaiApiKeySet && (
                <p className="hint">Leave blank to keep the existing key.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="openai-model">Model</label>
              <input
                id="openai-model"
                type="text"
                placeholder="e.g. gpt-4o-mini"
                value={form.openaiModel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, openaiModel: e.target.value }))
                }
              />
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

        {form.llmProvider === 'openrouter' && (
          <>
            <div className="field">
              <label htmlFor="openrouter-key">OpenRouter API key</label>
              <input
                id="openrouter-key"
                type="password"
                placeholder={
                  form.openrouterApiKeySet ? 'Key is set — enter new key to replace' : 'sk-or-…'
                }
                value={openrouterApiKey}
                onChange={(e) => setOpenrouterApiKey(e.target.value)}
              />
              {form.openrouterApiKeySet && (
                <p className="hint">Leave blank to keep the existing key.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="openrouter-model">Model</label>
              <input
                id="openrouter-model"
                type="text"
                placeholder="e.g. anthropic/claude-sonnet-4"
                value={form.openrouterModel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, openrouterModel: e.target.value }))
                }
              />
              <p className="hint">
                Use OpenRouter model slugs (see{' '}
                <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
                  openrouter.ai/models
                </a>
                ).
              </p>
            </div>

            <div className="field">
              <label htmlFor="openrouter-provider-order">Provider order (optional)</label>
              <input
                id="openrouter-provider-order"
                type="text"
                placeholder="e.g. anthropic, deepinfra"
                value={form.openrouterProviderOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, openrouterProviderOrder: e.target.value }))
                }
              />
              <p className="hint">
                Comma-separated OpenRouter provider slugs. Leave blank for default routing.
              </p>
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
        <div className="card-title">Task models</div>
        <p className="hint">
          Override provider/model per task. Leave as Default to use the global LLM settings above.
          Credentials and base URLs stay shared.
        </p>

        {LLM_TASK_DEFS.map(({ key, label }) => {
          const task = form.llmTasks[key] ?? DEFAULT_LLM_TASK;
          return (
            <div key={key} className="collector-card">
              <h3>{label}</h3>
              <div className="field">
                <label htmlFor={`task-${key}-provider`}>Provider</label>
                <select
                  id={`task-${key}-provider`}
                  value={task.provider}
                  onChange={(e) => updateLlmTask(key, 'provider', e.target.value)}
                >
                  <option value="">Default ({form.llmProvider})</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`task-${key}-model`}>Model</label>
                <input
                  id={`task-${key}-model`}
                  type="text"
                  placeholder={defaultModelHint(task.provider)}
                  value={task.model}
                  onChange={(e) => updateLlmTask(key, 'model', e.target.value)}
                />
                <p className="hint">Leave blank to use that provider&apos;s global model.</p>
              </div>
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Test provider</div>
        <p className="hint">
          Saves the form above, then sends a tiny ping to the selected LLM.
        </p>
        <div className="btn-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTestProvider}
            disabled={testingProvider || saving}
          >
            {testingProvider ? 'Testing…' : 'Save & test'}
          </button>
        </div>
        {testResult?.ok && (
          <p className="hint" style={{ marginTop: 12 }}>
            Reply from <code>{testResult.provider}</code>: {testResult.reply || '(empty)'}
          </p>
        )}
        {testResult && !testResult.ok && (
          <p className="hint" style={{ marginTop: 12 }}>
            Failed: {testResult.error}
          </p>
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
