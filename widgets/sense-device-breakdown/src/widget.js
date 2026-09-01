import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";
import { buildDeviceRows } from "./model.js";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const context = await host.getContext();
const title = await host.translate("widget.title");

root.innerHTML = `
  <style>
    :root { color-scheme: light dark; font: 14px/1.4 system-ui, sans-serif; }
    main { box-sizing: border-box; min-height: 300px; padding: 18px; color: CanvasText; background: Canvas; }
    h2 { margin: 0 0 12px; font-size: 1rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, transparent); padding: 8px 0; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .watts { font-weight: 720; font-variant-numeric: tabular-nums; }
    .off { opacity: .56; }
    [role=status] { opacity: .68; }
  </style>
  <main dir="${context.localization?.direction || "ltr"}">
    <h2>${escapeHtml(title)}</h2>
    <ul aria-live="polite"></ul>
    <p role="status">loading</p>
  </main>`;

const list = root.querySelector("ul");
const status = root.querySelector("[role=status]");
const stop = await host.subscribeState({}, (event) => {
  status.textContent = event.status || event.kind;
  if (event.kind !== "snapshot" && event.kind !== "point") return;
  const state = event.data?.primaryState || event.data?.state || event.data?.value || event.data || {};
  renderDevices(buildDeviceRows(state));
});

window.addEventListener("pagehide", stop, { once: true });
await host.ready({ height: 320 });

function renderDevices(devices) {
  list.innerHTML = devices.length
    ? devices.map((device) => `<li class="${device.is_on ? "" : "off"}"><span class="name">${escapeHtml(device.name || device.device_id || "Device")}</span><span class="watts">${formatNumber(device.power_w)} W</span></li>`).join("")
    : "<li>No detected devices are active.</li>";
  const height = Math.min(720, Math.max(180, 118 + devices.length * 49));
  host.setHeight(height);
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number) : "—";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
