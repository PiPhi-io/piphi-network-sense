# PiPhi Network Sense

PiPhi runtime integration for the [Sense Energy Monitor](https://sense.com/), built with `piphi-runtime-kit-python` and the `piphi-network-create` cloud-polling scaffold.

The integration uses the unofficial [`sense-energy`](https://github.com/scottbonline/sense) Python client. It maintains exactly one authenticated client, polls realtime data no more often than once per minute, refreshes daily trend data on a slower interval, exposes detected Sense devices as PiPhi entities, and supports Sense MFA during configuration. A best-effort extension reuses that same session for read-only appliance metadata, Always On/Other watts, and recent timeline events; failures there never disconnect normal monitoring.

## Run locally

```bash
pdm install -G dev
pdm run pytest
pdm run python scripts/validate.py
pdm run uvicorn piphi_network_sense.main:app --reload --port 8090
```

Configure the runtime through `POST /config`:

```json
{
  "id": "sense-account",
  "email": "owner@example.com",
  "password": "your-password",
  "mfa_code": "only-when-requested",
  "alias": "Sense Home",
  "poll_interval_seconds": 60,
  "trend_interval_seconds": 900
}
```

The manifest declares `config.maximum_instances: 1`. The runtime independently returns `409 instance_limit_reached` if a second configuration reaches it, protecting Sense from duplicate authenticated sessions even when used with an older Core.

## Behaviors and automations

The behavior catalog defines separate Core behavior types for the Sense monitor and each detected appliance. Monitor automations can react to household power, solar power, Always On, and Other changes or compare those values and daily usage against thresholds. Appliance automations have distinct `turns on` and `turns off` transition triggers, a power-change trigger, and conditions for current state, power, and daily energy.

Each appliance is delivered to Core as its own telemetry device, so `device.state_changed` events target the selected Sense appliance rather than only the parent monitor. Sense remains read-only; `refresh` is its only action, while notifications and load-control actions can be composed from other integrations.

The executable half uses the Runtime SDK directly: `refresh` is registered with `@automations.action`; `device.state_changed`, `device.power.turned_on`, and `device.power.turned_off` are registered as telemetry-projected events; and startup runs `assert_behaviors_contract` to prevent drift between the decorators and `behaviors.json`. Conditions remain declarative because Core evaluates them against projected telemetry state.

## Dashboard cards

Two Widget SDK projects are included:

- `widgets/sense-energy-flow`: live home/solar power and daily consumption/production.
- `widgets/sense-device-breakdown`: a responsive list of detected devices, Always On, and Other loads sorted by power.

Each widget can be validated independently:

```bash
cd widgets/sense-energy-flow
npm install
npm run test
npm run conformance
```

See [Sense library research](docs/sense-library-research.md) and the [Core single-instance contract](docs/core-single-instance-contract.md) for implementation constraints and the Core-side enforcement design.

## Runtime contract

The service exposes `/health`, `/diagnostics`, `/discover`, `/config`, `/config/sync`, `/deconfigure`, `/state`, `/contract`, `/entities`, `/events`, `/telemetry/example`, and `/command` on port `8090`.

Build the production image with:

```bash
docker build -t piphinetwork/piphi-network-sense:0.1.0 .
```
