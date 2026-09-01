import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const context = await host.getContext();
const title = await host.translate("widget.title");

root.innerHTML = `
  <style>
    :root { color-scheme: light dark; font: 14px/1.4 system-ui, sans-serif; }
    main { box-sizing: border-box; min-height: 240px; padding: 18px; color: CanvasText; background: Canvas; }
    h2 { margin: 0 0 14px; font-size: 1rem; }
    .flow { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; }
    .value { font-size: clamp(1.5rem, 7vw, 2.7rem); font-weight: 750; font-variant-numeric: tabular-nums; }
    .solar { text-align: end; color: #15945d; }
    .arrow { font-size: 1.6rem; opacity: .65; }
    .daily { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
    .daily div { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; padding: 10px; }
    small, [role=status] { opacity: .68; }
  </style>
  <main dir="${context.localization?.direction || "ltr"}">
    <h2>${escapeHtml(title)}</h2>
    <section class="flow" aria-label="Current power flow">
      <div><small>Home</small><div class="value" data-key="active_power_w">—</div><small>W</small></div>
      <span class="arrow" aria-hidden="true">⇄</span>
      <div class="solar"><small>Solar</small><div class="value" data-key="active_solar_power_w">—</div><small>W</small></div>
    </section>
    <section class="daily">
      <div><small>Used today</small><strong data-key="daily_usage_kwh">—</strong> kWh</div>
      <div><small>Produced today</small><strong data-key="daily_production_kwh">—</strong> kWh</div>
    </section>
    <p role="status">loading</p>
  </main>`;

const status = root.querySelector("[role=status]");
const stop = await host.subscribeState(
  { capabilityIds: ["active_power_w", "active_solar_power_w", "daily_usage_kwh", "daily_production_kwh"] },
  (event) => {
    status.textContent = event.status || event.kind;
    if (event.kind !== "snapshot" && event.kind !== "point") return;
    const state = extractState(event.data);
    for (const node of root.querySelectorAll("[data-key]")) {
      const value = state[node.dataset.key];
      if (value !== undefined && value !== null) node.textContent = formatNumber(value);
    }
  },
);

window.addEventListener("pagehide", stop, { once: true });
await host.ready({ height: 260 });

function extractState(data) {
  return data?.primaryState || data?.state || data?.value || data || {};
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number) : "—";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
