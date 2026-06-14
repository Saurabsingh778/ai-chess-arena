import { useEffect, useRef, useState } from 'react';

const LOG_META = {
  GAME_START: { icon: '🟢', label: 'GAME_START' },
  TURN_START: { icon: '🔵', label: 'TURN_START' },
  MODEL_THINKING: { icon: '⚪', label: 'MODEL_THINKING' },
  MOVE_PROPOSED: { icon: '🟡', label: 'MOVE_PROPOSED' },
  MOVE_APPLIED: { icon: '✅', label: 'MOVE_APPLIED' },
  ILLEGAL_MOVE: { icon: '❌', label: 'ILLEGAL_MOVE' },
  GAME_END: { icon: '🔴', label: 'GAME_END' },
  GRAPH_STATE: { icon: '⚙️', label: 'GRAPH_STATE' },
  RAW_OUTPUT: { icon: '📡', label: 'RAW_OUTPUT' },
};

export default function EventLog({ events, isRunning }) {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (listRef.current && shouldAutoScroll.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, collapsed]);

  const handleScroll = () => {
    const element = listRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 24;
  };

  return (
    <section className={`event-console ${collapsed ? 'collapsed' : ''}`}>
      <div className="console-header">
        <div>
          <span className="eyebrow">Console</span>
          <strong>LangGraph Event Log</strong>
        </div>
        <div className="console-actions">
          {isRunning && <span className="live-dot" />}
          <button className="icon-button" type="button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="console-list" ref={listRef} onScroll={handleScroll}>
          {events.length === 0 && (
            <div className="log-entry muted">
              <span>[--:--:--.---]</span>
              <span>[GRAPH_STATE]</span>
              <span>[System]</span>
              <p>Waiting for match events.</p>
            </div>
          )}

          {events.map((event) => (
            <LogEntry event={event} key={event.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function LogEntry({ event }) {
  const meta = LOG_META[event.logType] || LOG_META.GRAPH_STATE;

  return (
    <article className={`log-entry ${event.logType}`}>
      <span className="log-time">[{event.displayTime}]</span>
      <span className="log-type">[{meta.icon} {meta.label}]</span>
      <span className="log-player">[{event.player || 'System'}]</span>
      <p>{event.message}</p>

      {(event.rawText || event.details) && (
        <details className="log-details">
          <summary>{event.rawText ? 'Raw output' : 'Details'}</summary>
          {event.rawText && <pre>{event.rawText}</pre>}
          {event.details && <pre>{JSON.stringify(event.details, null, 2)}</pre>}
        </details>
      )}
    </article>
  );
}
