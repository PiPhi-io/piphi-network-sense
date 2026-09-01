import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../widget.manifest.json" with { type: "json" };
import { validateWidgetManifest } from "piphi-network-widget-sdk/manifest";
import { buildDeviceRows } from "../src/model.js";

test("manifest is publishable", () => {
  assert.equal(validateWidgetManifest(manifest).filter((item) => item.severity === "error").length, 0);
});

test("monitor breakdown includes Always On and Other values", () => {
  const rows = buildDeviceRows({
    devices: [{ device_id: "oven", name: "Oven", power_w: 800, is_on: true }],
    always_on_power_w: 125,
    other_power_w: 75,
  });

  assert.deepEqual(rows.map((row) => row.device_id), ["oven", "always_on", "other"]);
  assert.equal(rows[1].is_on, true);
});

test("unavailable extended values do not create zero-watt buckets", () => {
  assert.deepEqual(buildDeviceRows({ always_on_power_w: null, other_power_w: null }), []);
});

test("realtime pseudo-devices are not duplicated", () => {
  const rows = buildDeviceRows({
    devices: [{ device_id: "always_on", name: "Always On", power_w: 90 }],
    always_on_power_w: 90,
  });
  assert.equal(rows.length, 1);
});
