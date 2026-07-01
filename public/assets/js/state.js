/** 같은 브라우저의 교사용 화면과 학생용 화면을 동기화합니다. */
const EQ_STATE = (() => {
  const CHANNEL = "everyone-expedition-v3";
  const STORAGE_KEY = "everyone_expedition_session_v3";
  const TEAM_COLORS = ["#f27c66", "#79b9d2", "#f7c85b", "#9d8bd8"];
  const listeners = new Set();
  let channel = null;

  function read() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch { return null; }
  }

  function notify(state) {
    listeners.forEach((listener) => {
      try { listener(state); } catch (error) { console.error(error); }
    });
  }

  function init(listener) {
    if (listener) listeners.add(listener);
    if (!channel && "BroadcastChannel" in window) {
      channel = new BroadcastChannel(CHANNEL);
      channel.addEventListener("message", (event) => {
        if (event.data?.type !== "state") return;
        const state = event.data.state;
        try {
          if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          else localStorage.removeItem(STORAGE_KEY);
        } catch {}
        notify(state);
      });
    }
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) notify(read());
    });
    return read();
  }

  function set(state) {
    const next = state ? { ...state, updatedAt: Date.now() } : null;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("수업 상태를 저장하지 못했습니다.", error);
    }
    try { channel?.postMessage({ type: "state", state: next }); } catch {}
    notify(next);
    return next;
  }

  function update(patch) {
    return set({ ...(read() || {}), ...patch });
  }

  function clear() { set(null); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

  return { init, get: read, set, update, clear, subscribe, TEAM_COLORS };
})();
