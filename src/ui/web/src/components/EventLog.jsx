import { useEffect, useRef } from 'react';

/**
 * Real-time scrolling event log — shows all game events with timestamps and color coding.
 */
export default function EventLog({ events, isRunning }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'move_event': return '♟';
      case 'error_event': return '⚠';
      case 'game_event': return '🏆';
      case 'system_event': return '⚙';
      default: return '•';
    }
  };

  return (
    <div className="event-log glass-card">
      <h3>
        <span>Live Events</span>
        {isRunning && <span className="dot"></span>}
      </h3>

      <div className="event-list" ref={listRef}>
        {events.length === 0 && (
          <div className="event-item system-event" style={{ opacity: 0.5, justifyContent: 'center' }}>
            <span className="event-text">No events yet — start a match!</span>
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} className={`event-item ${event.type || 'system-event'}`}>
            <span className="event-time">{event.displayTime}</span>
            <span className="event-icon">{getEventIcon(event.type)}</span>
            <span className="event-text" dangerouslySetInnerHTML={{
              __html: formatEventText(event.text),
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple formatting: bold text wrapped in ** markers.
 */
function formatEventText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
