"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import type { AccountOption } from "@/lib/analytics";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export default function ImportForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNewAccount, setIsNewAccount] = useState(accounts.length === 0);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newBrokerName, setNewBrokerName] = useState("Manual");

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      setFileName(file.name);
      setCsvText(await file.text());
      return;
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        // Just use the first sheet — matches the common case of a
        // single-sheet export. If you're working from a multi-sheet
        // workbook, make sure your reformatted trade data is on
        // whichever sheet appears first.
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        setFileName(file.name);
        setCsvText(csv);
      } catch {
        setError("Could not read that Excel file. Make sure it's a valid .xlsx/.xls file.");
      }
      return;
    }

    setError("Please upload a .csv or .xlsx file matching the template.");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);

    if (!csvText) {
      setError("Choose a CSV file first.");
      return;
    }

    setSubmitting(true);

    try {
      let tradingAccountId = selectedAccountId;

      if (isNewAccount) {
        if (!newAccountNumber || !newBrokerName) {
          setError("Account number and broker name are required.");
          setSubmitting(false);
          return;
        }
        const accountRes = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountNumber: newAccountNumber, brokerName: newBrokerName }),
        });
        const accountData = await accountRes.json();
        if (!accountRes.ok) {
          setError(accountData.error ?? "Failed to create account");
          setSubmitting(false);
          return;
        }
        tradingAccountId = accountData.account.id;
      }

      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingAccountId, csvText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setSubmitting(false);
        return;
      }

      setResult(data);
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
      <a
        href="/trade-import-template.csv"
        download
        className="flex w-fit items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:opacity-80"
      >
        <Download size={14} />
        Download CSV template
      </a>

      {/* Account */}
      <div>
        <label className={labelClass}>Account</label>
        {accounts.length > 0 && (
          <div className="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsNewAccount(false)}
              className={`rounded-full px-3 py-1 ${!isNewAccount ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"}`}
            >
              Existing account
            </button>
            <button
              type="button"
              onClick={() => setIsNewAccount(true)}
              className={`rounded-full px-3 py-1 ${isNewAccount ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"}`}
            >
              New account
            </button>
          </div>
        )}
        {isNewAccount ? (
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Account number" value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} className={inputClass} />
            <input placeholder="Broker name" value={newBrokerName} onChange={(e) => setNewBrokerName(e.target.value)} className={inputClass} />
          </div>
        ) : (
          <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className={inputClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.brokerName} · #{a.accountNumber}</option>
            ))}
          </select>
        )}
      </div>

      {/* Drop zone */}
      <div>
        <label className={labelClass}>CSV File</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging ? "border-accent bg-profit-muted" : "border-border bg-bg-elevated"
          }`}
        >
          <Upload size={24} className="mb-2 text-text-muted" />
          <p className="text-sm text-text-primary">
            {fileName ?? "Drag & drop your CSV or Excel file here, or click to browse"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      {result && (
        <div className="rounded-xl border border-border bg-bg-elevated p-4 text-sm">
          <p className="font-medium text-profit">{result.imported} trade(s) imported</p>
          {result.skipped > 0 && (
            <>
              <p className="mt-1 text-loss">{result.skipped} row(s) skipped</p>
              <ul className="mt-2 space-y-1 text-xs text-text-muted">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !csvText}
          className="flex-1 rounded-full bg-accent-dark py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Importing..." : "Import Trades"}
        </button>
        {result && (
          <button
            type="button"
            onClick={() => { router.push("/"); router.refresh(); }}
            className="rounded-full bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}