import { useEffect, useState } from "react";
import { Maximize, Minimize, RotateCcw } from "lucide-react";

interface ActionPanelProps {
  onReset: () => void;
}

export function ActionPanel({ onReset }: ActionPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="action-panel">
      <button type="button" className="rail-btn" onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>
      <button type="button" className="rail-btn" onClick={onReset}>
        <RotateCcw size={15} />
        Reset Duel
      </button>
    </div>
  );
}
