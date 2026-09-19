// WebSocket client for live poll updates

const WS_BASE_URL = (() => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  const isHttps = window.location.protocol === 'https:';
  const protocol = isHttps ? 'wss:' : 'ws:';
  // Use port 8080 where backend is running
  return `${protocol}//localhost:8080/api/polls`;
})();

export function createPollWebSocket(pollId, onMessage, onStatusChange) {
  let ws = null;
  let reconnectTimeout = null;
  let isClosedManually = false;
  let retryCount = 0;

  function connect() {
    if (isClosedManually) return;

    try {
      const url = `${WS_BASE_URL}/${pollId}/live`;
      if (onStatusChange) onStatusChange('connecting');
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryCount = 0;
        if (onStatusChange) onStatusChange('connected');
        console.log(`[WebSocket] Connected to live updates for poll: ${pollId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('[WebSocket] Error parsing event message:', err);
        }
      };

      ws.onclose = () => {
        if (!isClosedManually) {
          if (onStatusChange) onStatusChange('disconnected');
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
          retryCount++;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Error on live connection:', err);
        ws.close();
      };
    } catch (err) {
      console.error('[WebSocket] Failed to initialize connection:', err);
      if (!isClosedManually) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return {
    disconnect: () => {
      isClosedManually = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      if (onStatusChange) onStatusChange('closed');
    },
  };
}
