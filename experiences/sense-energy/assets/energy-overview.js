const host = window.PiPhiWidgetHost;
const root = document.querySelector("#piphi-widget-root");

if (!host || !root) {
  throw new Error("PiPhi Widget Host is unavailable.");
}

root.innerHTML = `
  <main class="sense-overview" aria-label="Sense Energy Overview">
    <header class="sense-header">
      <div>
        <span class="eyebrow">Live energy</span>
        <h2>Home usage</h2>
      </div>
      <button class="connection" type="button" data-piphi-interaction-target="energy-card" aria-label="View Sense connection details">
        <span class="connection-dot" aria-hidden="true"></span>
        <span data-value="connected">Connecting</span>
      </button>
    </header>

    <section class="live-panel" aria-label="Live household power">
      <button class="hero-reading" type="button" data-piphi-interaction-target="home-power" aria-label="View household power history">
        <span class="reading-label">Using now</span>
        <span class="hero-value"><strong data-value="home-power">—</strong><small data-unit="home-power">W</small></span>
      </button>
      <button class="solar-reading" type="button" data-piphi-interaction-target="solar-power" aria-label="View solar power history">
        <span class="sun-icon" aria-hidden="true">☀</span>
        <span class="solar-copy">
          <small>Solar now</small>
          <span class="solar-value"><strong data-value="solar-power">—</strong><em data-unit="solar-power">W</em></span>
        </span>
      </button>
    </section>

    <section class="today-panel" aria-label="Daily and background energy at a glance">
      <div class="today-readings">
        <button type="button" data-piphi-interaction-target="usage-today" aria-label="View daily usage history">
          <span>Used</span><strong data-value="usage-today">—</strong><small data-unit="usage-today">kWh</small>
        </button>
        <button type="button" data-piphi-interaction-target="production-today" aria-label="View daily production history">
          <span>Produced</span><strong data-value="production-today">—</strong><small data-unit="production-today">kWh</small>
        </button>
        <button type="button" data-piphi-interaction-target="energy-card" aria-label="View background energy details">
          <span>Background</span><strong data-value="background-total">—</strong><small>W</small>
        </button>
      </div>
    </section>

    <p class="data-status" role="status" aria-live="polite">Loading Sense readings…</p>
  </main>`;

const values = new Map();
const stops = [];
const slotIds = ["connected", "home-power", "solar-power", "usage-today", "production-today", "always-on", "other"];
const liveSlotIds = ["home-power", "solar-power", "always-on", "other"];

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, maximumFractionDigits = 1) {
  const number = numericValue(value);
  return number === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(number);
}

function stateFromResult(result) {
  const state = result?.primaryState || result?.states?.[0];
  return state ? { value: state.value ?? state.display_value, unit: state.unit } : null;
}

function stateFromEvent(event) {
  if (event?.kind === "point") {
    return { value: event.data?.value, unit: event.data?.unit };
  }
  if (event?.kind === "snapshot") {
    return stateFromResult(event.data);
  }
  return null;
}

function applyState(slotId, state) {
  if (!state) return false;
  values.set(slotId, state);
  render();
  root.querySelector(".data-status").hidden = true;
  return true;
}

function render() {
  for (const slotId of slotIds) {
    const state = values.get(slotId);
    const valueNode = root.querySelector(`[data-value="${slotId}"]`);
    if (!valueNode || !state) continue;
    if (slotId === "connected") {
      const connected = state.value === true || state.value === 1 || ["true", "on", "online", "connected"].includes(String(state.value).toLowerCase());
      valueNode.textContent = connected ? "Connected" : "Unavailable";
      root.querySelector(".connection")?.classList.toggle("is-connected", connected);
      continue;
    }
    valueNode.textContent = formatNumber(state.value, slotId.includes("today") ? 1 : 0);
    const unitNode = root.querySelector(`[data-unit="${slotId}"]`);
    if (unitNode && state.unit) unitNode.textContent = state.unit;
  }

  const alwaysOn = numericValue(values.get("always-on")?.value) ?? 0;
  const other = numericValue(values.get("other")?.value) ?? 0;
  const home = numericValue(values.get("home-power")?.value) ?? 0;
  const backgroundTotal = alwaysOn + other;
  const alwaysPercent = backgroundTotal > 0 ? (alwaysOn / backgroundTotal) * 100 : 50;
  const backgroundPercent = home > 0 ? Math.min(100, (backgroundTotal / home) * 100) : 0;

  root.querySelector('[data-value="background-total"]').textContent = formatNumber(backgroundTotal, 0);
  root.querySelector('[data-value="background-total"]').title = `${formatNumber(backgroundPercent, 0)}% of live use · ${formatNumber(alwaysPercent, 0)}% always on`;
}

async function subscribe(slotId) {
  try {
    const stop = await host.subscribeState({ slotId }, (event) => {
      const state = stateFromEvent(event);
      if (!applyState(slotId, state) && event?.kind === "error") {
        const status = root.querySelector(".data-status");
        status.hidden = false;
        status.textContent = "Some Sense readings are unavailable";
      }
    });
    stops.push(stop);
  } catch (error) {
    console.warn(`Sense live subscription unavailable for ${slotId}`, error);
  }
}

async function loadSlot(slotId) {
  try {
    return applyState(slotId, stateFromResult(await host.getCapabilityState({ slotId })));
  } catch (error) {
    console.warn(`Sense reading unavailable for ${slotId}`, error);
    return false;
  }
}

const loaded = await Promise.all(slotIds.map(loadSlot));
if (!loaded.some(Boolean)) {
  const status = root.querySelector(".data-status");
  status.hidden = false;
  status.textContent = "Waiting for Sense data";
}
await Promise.all(liveSlotIds.map(subscribe));
await host.ready({ height: 168 });

const refreshTimer = window.setInterval(() => {
  void Promise.all(slotIds.map(loadSlot));
}, 30_000);

window.addEventListener("pagehide", () => {
  window.clearInterval(refreshTimer);
  for (const stop of stops) void stop();
}, { once: true });
