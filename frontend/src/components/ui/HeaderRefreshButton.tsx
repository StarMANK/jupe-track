"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRefresh } from "@/components/RefreshProvider";

export default function HeaderRefreshButton() {
  const { triggerRefresh, refreshInterval, setRefreshInterval, logicalSystem, setLogicalSystem, availableSystems } = useRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerRefresh();
    // Visual feedback duration
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const logicalSystemSelect = (id: string) => (
    <select
      id={id}
      className="h-9 w-full rounded border border-outline-variant bg-surface-container-high px-3 font-mono text-sm text-primary outline-none transition-colors hover:border-primary focus-visible:border-primary"
      value={logicalSystem}
      onChange={(event) => setLogicalSystem(event.target.value)}
    >
      {availableSystems.map((system) => (
        <option key={system} value={system}>{system}</option>
      ))}
    </select>
  );

  const intervalSelect = (id: string) => (
    <select
      id={id}
      className="h-9 w-full rounded border border-outline-variant bg-surface-container-high px-2 text-sm text-on-surface outline-none transition-colors hover:border-primary focus-visible:border-primary"
      value={refreshInterval}
      onChange={(event) => setRefreshInterval(Number(event.target.value))}
    >
      <option value={5}>5s</option>
      <option value={10}>10s</option>
      <option value={30}>30s</option>
      <option value={60}>1m</option>
      <option value={0}>Off</option>
    </select>
  );

  const refreshButton = (compact = false) => (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label={isRefreshing ? "Refreshing telemetry" : "Refresh telemetry now"}
      className={compact
        ? "flex h-9 w-full items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-high px-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50"
        : "flex h-9 items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-high px-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50"}
    >
      <RefreshCw aria-hidden="true" className={`size-4 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
      <span>{isRefreshing ? "Refreshing..." : "Refresh Now"}</span>
    </button>
  );

  return (
    <>
      <details className="group relative xl:hidden">
        <summary
          aria-label="Open refresh controls"
          className="flex size-11 cursor-pointer list-none items-center justify-center rounded border border-outline-variant bg-surface-container-high text-primary marker:content-none hover:bg-surface-container-highest"
        >
          <RefreshCw aria-hidden="true" className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </summary>
        <div className="absolute right-0 top-12 z-40 grid w-64 gap-3 rounded border border-outline-variant bg-surface-container-low p-3 shadow-none">
          <div className="grid gap-1">
            <label htmlFor="mobile-logical-system" className="text-xs text-on-surface-variant">Logical System</label>
            {logicalSystemSelect("mobile-logical-system")}
          </div>
          <div className="grid gap-1">
            <label htmlFor="mobile-refresh-interval" className="text-xs text-on-surface-variant">Auto Refresh</label>
            {intervalSelect("mobile-refresh-interval")}
          </div>
          {refreshButton(true)}
        </div>
      </details>

      <div className="hidden items-center gap-4 xl:flex">
        <div className="flex items-center gap-2">
          <label htmlFor="header-logical-system" className="text-xs text-on-surface-variant">Logical System</label>
          <div className="w-36">{logicalSystemSelect("header-logical-system")}</div>
        </div>
        <div className="h-6 w-px bg-outline-variant" />
        <div className="flex items-center gap-2">
          <label htmlFor="header-refresh-interval" className="text-xs text-on-surface-variant">Auto Refresh</label>
          <div className="w-20">{intervalSelect("header-refresh-interval")}</div>
        </div>
        {refreshButton()}
      </div>
    </>
  );
}
