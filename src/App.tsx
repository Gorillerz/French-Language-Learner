import { useState } from "react";
import { useIsOnline } from "./connection";
import { GrammarArea } from "./grammar/GrammarArea";
import { useIsOfflineReady } from "./offlineReady";

const areas = ["Vocabulary", "Grammar", "Progress"] as const;
type Area = (typeof areas)[number];

export function App() {
  const [area, setArea] = useState<Area>("Vocabulary");
  const isOnline = useIsOnline();
  const isOfflineReady = useIsOfflineReady();

  return (
    <div className="shell">
      <header className="shell-header">
        <h1>French Learning</h1>
        <div className="shell-status">
          {isOfflineReady && <span>Ready for offline use</span>}
          <p
            role="status"
            aria-label="Connection"
            className={isOnline ? "connection" : "connection connection-offline"}
          >
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </header>

      <nav className="shell-nav" aria-label="Areas">
        {areas.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={name === area ? "page" : undefined}
            onClick={() => setArea(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      <main className="shell-main">
        <h2>{area}</h2>
        {area === "Grammar" && <GrammarArea />}
      </main>
    </div>
  );
}
