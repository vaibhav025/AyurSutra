import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  FileCode,
  Download,
  Sparkles,
  Table2,
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, SUPABASE_SEED_SQL, SUPABASE_CLIENT_SNIPPET } from '../services/sqlCode';
import { PageHeader, Card, Button } from './ui';

type CodeTab = 'schema' | 'seed' | 'client';

const TABS: { id: CodeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'schema', label: 'Schema & stored procedures', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'seed', label: 'Seed data', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'client', label: 'Client snippet', icon: <FileCode className="w-3.5 h-3.5" /> },
];

export const SqlSchemaViewer: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('schema');
  const [copied, setCopied] = useState(false);

  const getCode = () => {
    switch (activeCodeTab) {
      case 'schema':
        return SUPABASE_SQL_SCHEMA;
      case 'seed':
        return SUPABASE_SEED_SQL;
      case 'client':
        return SUPABASE_CLIENT_SNIPPET;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([getCode()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = activeCodeTab === 'client' ? 'ayursutra-client.ts' : 'ayursutra-schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const lineCount = getCode().split('\n').length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Developer hub"
        title="SQL & RPC engine"
        description="Production-grade DDL, atomic stored procedures and client integration snippets — ready for the Supabase SQL editor."
      />

      {/* Schema relationship cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['bookings', 'Core scheduling table'],
          ['therapies', 'Panchakarma protocols'],
          ['resource_rooms', 'Droni chamber registry'],
          ['inventory_items', 'Medicated stock ledger'],
        ].map(([table, desc]) => (
          <Card key={table} className="p-4 space-y-1" hover>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-forest">
              <Table2 className="w-3.5 h-3.5" />
              {table}
            </p>
            <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Code panel */}
      <div className="glass-dark rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(23,32,29,0.35)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label="Code sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeCodeTab === tab.id}
                onClick={() => setActiveCodeTab(tab.id)}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeCodeTab === tab.id
                    ? 'bg-sage/20 text-sage border border-sage/30'
                    : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block font-mono text-[10px] text-slate-500 mr-1">
              {lineCount} lines
            </span>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={handleCopy}
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                copied
                  ? 'bg-success/25 text-emerald-200'
                  : 'bg-sage text-forest-deep hover:brightness-110'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Code */}
        <div
          className="px-5 py-5 max-h-[620px] overflow-auto selection:bg-sage/40 selection:text-white"
          role="tabpanel"
        >
          <pre className="font-mono text-[12px] leading-relaxed text-[#c8d6cf] whitespace-pre">
            {getCode()}
          </pre>
        </div>
      </div>
    </div>
  );
};
