// Admin "Student Mental Wellness Analytics" panel: upload a survey CSV and see
// stress, sleep and academic analysis plus an ML stress prediction.
// Every number here comes from the backend's analysis of the uploaded rows.
import React, { useEffect, useRef, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Upload, Database, Trash2, Sparkles, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LEVEL_COLORS = { Low: '#22a37a', Medium: '#e8a33d', High: '#d9485f' };
const LEVELS = ['Low', 'Medium', 'High'];
const tooltipStyle = { borderRadius: 12, border: '1px solid #ece6fb', fontSize: 12 };

const Card = ({ title, subtitle, children, className = '' }) => (
  <div className={`rounded-2xl border border-brand-100 bg-white p-5 ${className}`}>
    {title && <h4 className="font-semibold text-brand-950">{title}</h4>}
    {subtitle && <p className="mb-3 text-xs text-brand-400">{subtitle}</p>}
    {children}
  </div>
);

const LevelBars = ({ data }) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#efe9fc" />
        <XAxis dataKey="factor" tick={{ fontSize: 11, fill: '#6b5b95' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#b4a6d6' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v, `${name} stress (avg rating)`]} />
        <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={(item) => LEVELS.indexOf(item.value)} />
        {LEVELS.map((lvl) => (
          <Bar key={lvl} dataKey={lvl} fill={LEVEL_COLORS[lvl]} radius={[6, 6, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const DatasetAnalytics = () => {
  const { apiRequest } = useAuth();
  const fileRef = useRef(null);
  const [datasets, setDatasets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [inputs, setInputs] = useState({});
  const [prediction, setPrediction] = useState(null);

  const loadAnalysis = async (id) => {
    setError('');
    setPrediction(null);
    try {
      const result = await apiRequest(`/admin/datasets/${id}/analysis`);
      setAnalysis(result);
      const defaults = {};
      (result.prediction?.features || []).forEach((f) => {
        defaults[f.key] = Math.round((f.min + f.max) / 2);
      });
      setInputs(defaults);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDatasets = async (selectId) => {
    setLoading(true);
    try {
      const list = await apiRequest('/admin/datasets');
      setDatasets(list);
      if (list.length) await loadAnalysis(selectId || list[0].id);
      else setAnalysis(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4_000_000) {
      setError('The file is too large (limit about 4 MB).');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const content = await file.text();
      const result = await apiRequest('/admin/datasets', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content }),
      });
      await loadDatasets(result.dataset.id);
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };

  const deleteDataset = async () => {
    if (!analysis || !window.confirm(`Delete dataset "${analysis.dataset.name}"?`)) return;
    try {
      await apiRequest(`/admin/datasets/${analysis.dataset.id}`, { method: 'DELETE' });
      await loadDatasets();
    } catch (err) {
      setError(err.message);
    }
  };

  const runPrediction = async () => {
    try {
      setPrediction(await apiRequest(`/admin/datasets/${analysis.dataset.id}/predict`, {
        method: 'POST',
        body: JSON.stringify({ features: inputs }),
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const stressLevels = analysis?.stress_levels || [];
  const total = analysis?.total_records || 0;
  const evaluation = analysis?.prediction?.evaluation;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-950">Student Mental Wellness Analytics</h3>
          <p className="text-sm text-brand-500">
            Upload a survey dataset (CSV). Every figure below is calculated from the uploaded rows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {datasets.length > 1 && (
            <select
              value={analysis?.dataset.id || ''}
              onChange={(e) => loadAnalysis(e.target.value)}
              className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-brand-900"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.record_count})</option>
              ))}
            </select>
          )}
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload CSV Dataset'}
          </button>
          {analysis && (
            <button onClick={deleteDataset} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50" aria-label="Delete dataset">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <p className="py-8 text-center text-sm text-brand-400">Loading datasets...</p>
      ) : !analysis ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center">
          <Database className="mx-auto h-8 w-8 text-brand-400" />
          <p className="mt-3 font-medium text-brand-900">No dataset uploaded yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-brand-500">
            Upload a CSV with a stress-level column. Columns for sleep quality, headaches, academic performance,
            study load, extracurricular activities, anxiety and depression are detected from their headers.
          </p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="text-2xl font-bold text-brand-950">{total.toLocaleString()}</div>
              <div className="text-xs text-brand-500">Total dataset records</div>
              <div className="mt-1 truncate text-[11px] text-brand-400" title={analysis.dataset.name}>{analysis.dataset.name}</div>
            </div>
            {stressLevels.map((s) => (
              <div key={s.name} className="rounded-2xl border border-brand-100 bg-white p-4">
                <div className="text-2xl font-bold" style={{ color: LEVEL_COLORS[s.name] }}>{s.value.toLocaleString()}</div>
                <div className="text-xs text-brand-500">{s.name} stress</div>
                <div className="mt-1 text-[11px] text-brand-400">{total ? Math.round((s.value / total) * 100) : 0}% of students</div>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-brand-400">
            <Info className="h-3.5 w-3.5" />
            Stress rating 1–{analysis.stress_scale_max}: Low = bottom 40% of the scale, Medium = middle, High = top 40%. Average rating {analysis.average_stress}.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Student Stress Distribution" subtitle="Share of students at each stress level">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stressLevels} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {stressLevels.map((s) => <Cell key={s.name} fill={LEVEL_COLORS[s.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} students (${Math.round((v / total) * 100)}%)`, `${n} stress`]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={(item) => LEVELS.indexOf(item.value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title={analysis.symptoms.has_anxiety_depression ? 'Anxiety and Depression Analysis' : 'Physical Symptoms by Stress Level'}
              subtitle={analysis.symptoms.has_anxiety_depression
                ? 'Average anxiety and depression rating at each stress level'
                : 'This dataset has no anxiety or depression columns, so headaches per week are shown instead'}
            >
              {analysis.symptoms.rows.length ? <LevelBars data={analysis.symptoms.rows} /> : (
                <p className="py-16 text-center text-sm text-brand-400">No anxiety, depression or symptom columns in this dataset.</p>
              )}
            </Card>

            <Card title="Academic Stress Factors" subtitle="Average rating of each factor at each stress level">
              {analysis.academic_factors.length ? <LevelBars data={analysis.academic_factors} /> : (
                <p className="py-16 text-center text-sm text-brand-400">No academic columns in this dataset.</p>
              )}
            </Card>

            <Card
              title="Sleep Quality and Stress"
              subtitle={analysis.sleep_vs_stress.length
                ? `Average stress for each sleep-quality rating (correlation r = ${analysis.sleep_stress_correlation})`
                : 'No sleep column in this dataset'}
            >
              {analysis.sleep_vs_stress.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysis.sleep_vs_stress} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#efe9fc" />
                      <XAxis dataKey="sleep" tick={{ fontSize: 11, fill: '#6b5b95' }} axisLine={false} tickLine={false}
                        label={{ value: 'Sleep quality rating', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#8b78b8' }} />
                      <YAxis domain={[1, analysis.stress_scale_max]} tick={{ fontSize: 11, fill: '#b4a6d6' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n, item) => [`${v} (${item.payload.students} students)`, 'Avg stress']} />
                      <Line type="monotone" dataKey="avg_stress" stroke="#7352c3" strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: '#7352c3', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Factor ranking */}
          {analysis.factor_correlations.length > 0 && (
            <Card title="Which factors move with stress?" subtitle="Pearson correlation with the stress rating (−1 to 1). Correlation is not causation.">
              <div className="space-y-2">
                {analysis.factor_correlations.map((c) => (
                  <div key={c.key} className="flex items-center gap-3 text-sm">
                    <span className="w-48 shrink-0 text-brand-900">{c.factor}</span>
                    <div className="relative h-2.5 flex-1 rounded-full bg-brand-50">
                      <div
                        className="absolute top-0 h-2.5 rounded-full"
                        style={{
                          left: c.r >= 0 ? '50%' : `${50 + c.r * 50}%`,
                          width: `${Math.abs(c.r) * 50}%`,
                          background: c.r >= 0 ? '#d9485f' : '#22a37a',
                        }}
                      />
                      <div className="absolute left-1/2 top-[-3px] h-4 w-px bg-brand-200" />
                    </div>
                    <span className="w-14 text-right font-mono text-xs text-brand-600">{c.r > 0 ? '+' : ''}{c.r}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ML prediction */}
          {analysis.prediction && (
            <Card
              title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" /> ML Stress Prediction</span>}
              subtitle={`${analysis.prediction.algorithm} trained on this dataset to predict the stress level from the other factors`}
            >
              {evaluation && (
                <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-700">
                  Accuracy on a held-out 20% of students: <b>{Math.round(evaluation.accuracy * 100)}%</b>
                  {' '}({evaluation.test_size} students). Always guessing "{evaluation.baseline_label}" would score{' '}
                  {Math.round(evaluation.baseline_accuracy * 100)}%.
                  {evaluation.accuracy <= evaluation.baseline_accuracy
                    ? ' The model is not better than that guess on this data, so treat predictions as unreliable.'
                    : ' Use predictions as a rough screening signal, not a diagnosis.'}
                </p>
              )}
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {analysis.prediction.features.map((f) => (
                    <label key={f.key} className="block">
                      <span className="flex justify-between text-sm text-brand-900">
                        {f.label} <span className="font-semibold text-brand-700">{inputs[f.key]}</span>
                      </span>
                      <input
                        type="range"
                        min={f.min}
                        max={f.max}
                        step={1}
                        value={inputs[f.key] ?? f.min}
                        onChange={(e) => setInputs({ ...inputs, [f.key]: Number(e.target.value) })}
                        className="w-full accent-brand-600"
                      />
                    </label>
                  ))}
                  <button onClick={runPrediction} className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
                    Predict stress level
                  </button>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-brand-50/60 p-5">
                  {prediction ? (
                    <>
                      <div className="text-xs text-brand-500">Predicted stress level</div>
                      <div className="text-3xl font-bold" style={{ color: LEVEL_COLORS[prediction.predicted_level] }}>
                        {prediction.predicted_level}
                      </div>
                      <div className="mt-4 space-y-2">
                        {LEVELS.filter((l) => l in prediction.probabilities).map((l) => (
                          <div key={l} className="flex items-center gap-3 text-sm">
                            <span className="w-16 text-brand-900">{l}</span>
                            <div className="h-2.5 flex-1 rounded-full bg-white">
                              <div className="h-2.5 rounded-full" style={{ width: `${prediction.probabilities[l] * 100}%`, background: LEVEL_COLORS[l] }} />
                            </div>
                            <span className="w-12 text-right text-xs text-brand-600">{Math.round(prediction.probabilities[l] * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-sm text-brand-400">Set the factors and press Predict.</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DatasetAnalytics;
