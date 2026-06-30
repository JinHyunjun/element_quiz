/**
 * EQ_STATE — BroadcastChannel 기반 게임 상태 관리
 * 교사 창(index.html) ↔ 프로젝터 창(display.html) 실시간 동기화
 */
const EQ_STATE = (() => {
  const CHANNEL = 'element-quiz-v1';
  const LS_KEY  = 'eq_state_v1';
  const TEAM_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981'];

  let _ch = null;
  const _listeners = [];

  function _broadcast(state) {
    try { _ch && _ch.postMessage({ type: 'eq', state }); } catch {}
  }

  function _notify(state) {
    _listeners.forEach(fn => { try { fn(state); } catch {} });
  }

  function init(onChange) {
    if (onChange) _listeners.push(onChange);

    try {
      _ch = new BroadcastChannel(CHANNEL);
      _ch.onmessage = (e) => {
        if (e.data?.type === 'eq') {
          // 로컬 스토리지 갱신 후 리스너 호출
          try { localStorage.setItem(LS_KEY, JSON.stringify(e.data.state)); } catch {}
          _notify(e.data.state);
        }
      };
    } catch {
      // BroadcastChannel 미지원 시 localStorage 폴링
      let lastTs = 0;
      setInterval(() => {
        const s = get();
        if (s && s._ts !== lastTs) { lastTs = s._ts; _notify(s); }
      }, 400);
    }

    return get();
  }

  function set(state) {
    const s = { ...state, _ts: Date.now() };
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
    _broadcast(s);
    return s;
  }

  function get() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }

  function update(patch) {
    return set({ ...get(), ...patch });
  }

  function clear() {
    try { localStorage.removeItem(LS_KEY); } catch {}
    _broadcast(null);
  }

  return { init, set, get, update, clear, TEAM_COLORS };
})();
