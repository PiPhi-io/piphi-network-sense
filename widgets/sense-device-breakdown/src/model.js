export function buildDeviceRows(state) {
  const devices = Array.isArray(state.devices)
    ? [...state.devices]
    : Object.values(state).filter(
        (value) => value && typeof value === "object" && "power_w" in value,
      );
  addPowerBucket(devices, "always_on", "Always On", state.always_on_power_w);
  addPowerBucket(devices, "other", "Other", state.other_power_w);
  return devices.sort((a, b) => Number(b.power_w || 0) - Number(a.power_w || 0));
}

function addPowerBucket(devices, deviceId, name, value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return;
  if (devices.some((device) => device.device_id === deviceId || String(device.name).toLowerCase() === name.toLowerCase())) return;
  devices.push({
    device_id: deviceId,
    name,
    power_w: Number(value),
    is_on: Number(value) > 0,
  });
}
