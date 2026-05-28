import { useEffect, useState } from "react";
import { ArrowLeft, Maximize, Minimize, RotateCcw } from "lucide-react";

interface ActionPanelProps {
  onReset?: () => void;
  onLeave?: () => void;
}

export function ActionPanel({ onReset, onLeave }: ActionPanelProps) {
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
      {onReset ? (
        <button type="button" className="rail-btn" onClick={onReset}>
          <RotateCcw size={15} />
          Reset Duel
        </button>
      ) : null}
      {onLeave ? (
        <button type="button" className="rail-btn" onClick={onLeave}>
          <ArrowLeft size={15} />
          Leave Duel
        </button>
      ) : null}
    </div>
  );
}
