import React, { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  FileCode, 
  Download, 
  Sparkles
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, SUPABASE_SEED_SQL, SUPABASE_CLIENT_SNIPPET } from '../services/sqlCode';

type CodeTab = 'schema' | 'seed' | 'client';

export const SqlSchemaViewer: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('schema');
  const [copied, setCopied] = useState<boolean>(false);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B9D83]/15 text-[#2D3A3A] text-xs font-semibold">
          <Database className="w-3.5 h-3.5 text-[#8B9D83]" />
          <span>Production Supabase SQL & RPC Engine Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          PostgreSQL DDL Schema, Stored Procedures & Storage
        </h1>
        <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
          Production-grade SQL definitions ready for instant execution in the Supabase SQL Editor. Includes atomic isolation, storage buckets for medical report PDFs, indexes, and full multi-variable constraint checking.
        </p>
      </div>

      {/* Code Viewer Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Tab Navigation & Action Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveCodeTab('schema')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeCodeTab === 'schema'
                  ? 'bg-[#2D3A3A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>1. Schema & Stored Procedures (RPC)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('seed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeCodeTab === 'seed'
                  ? 'bg-[#2D3A3A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Authentic Seed Data SQL</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('client')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeCodeTab === 'client'
                  ? 'bg-[#2D3A3A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>3. Next.js / Supabase JS Client</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8B9D83] hover:bg-[#7a8c72] flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
            </button>
          </div>

        </div>

        {/* Code Content */}
        <div className="p-6 overflow-x-auto max-h-[650px] overflow-y-auto font-mono text-xs text-slate-200 bg-[#2D3A3A] leading-relaxed selection:bg-[#8B9D83] selection:text-white">
          <pre>{getCode()}</pre>
        </div>

      </div>

    </div>
  );
};
