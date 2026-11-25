"use client";

import * as React from "react";

export interface MarketplaceMode {
  /** Seeded sample data and mock payments; every surface is labeled as a demo. */
  demo: boolean;
  /** Outbound email is configured. */
  email: boolean;
}

const ModeContext = React.createContext<MarketplaceMode>({ demo: true, email: false });

export function ModeProvider({ value, children }: { value: MarketplaceMode; children: React.ReactNode }) {
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  return React.useContext(ModeContext);
}
