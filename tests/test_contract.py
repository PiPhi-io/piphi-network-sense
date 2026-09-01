from __future__ import annotations

import json
from pathlib import Path

from piphi_network_sense.contract import CAPABILITIES, COMMANDS, REQUIRED_ENDPOINTS
from piphi_network_sense.main import app


def test_runtime_implements_contract_routes() -> None:
    routes = set(app.openapi()["paths"])
    for path in [
        "/health",
        "/diagnostics",
        "/discover",
        "/config",
        "/config/sync",
        "/deconfigure",
        "/deconfigure/{config_id}",
        "/ui-config",
        "/entities",
        "/state",
        "/contract",
        "/events",
        "/events/device/{config_id}/example",
        "/telemetry/example",
        "/telemetry/device/{config_id}/example",
        "/command",
    ]:
        assert path in routes

    assert REQUIRED_ENDPOINTS == ["health", "entities", "command", "config", "ui_config"]
    assert "refresh" in COMMANDS
    assert "active_power_w" in CAPABILITIES
    assert CAPABILITIES["always_on_power_w"]["unit"] == "W"
    assert CAPABILITIES["other_power_w"]["unit"] == "W"


def test_manifest_declares_single_instance_and_widget_packages() -> None:
    manifest = json.loads((Path(__file__).parents[1] / "manifest.json").read_text())
    assert manifest["config"]["maximum_instances"] == 1
    assert manifest["identity"]["fields"] == ["email"]
    assert {package["id"] for package in manifest["ui"]["widget_packages"]} == {
        "io.piphi.sense.energy-flow",
        "io.piphi.sense.device-breakdown",
    }
    assert set(manifest["capabilities"]) == set(CAPABILITIES)
