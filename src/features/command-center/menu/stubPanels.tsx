import React from 'react';

import {PhaseStubPanel} from './PhaseStubPanel';

export function ProfileStubPanel(): React.JSX.Element {
  return (
    <PhaseStubPanel
      title="User / Session"
      subtitle="Authentication shell lands with multi-tenant org model."
      rows={[
        {title: 'Login', hint: 'OIDC / enterprise SSO — not wired in Phase 1.'},
        {title: 'Logout', hint: 'Clears session + cached credentials.'},
        {title: 'Role display', hint: 'Pilot, observer, maintainer — RBAC selectors.'},
        {title: 'Profile', hint: 'Avatar, callsign, certificate metadata.'},
      ]}
    />
  );
}

export function OrganizationStubPanel(): React.JSX.Element {
  return (
    <PhaseStubPanel
      title="Organization"
      subtitle="Fleet + tenant isolation for squadrons and operators."
      rows={[
        {title: 'Create organization', hint: 'Provision tenant + signing keys.'},
        {title: 'Join organization', hint: 'Invite codes + domain trust.'},
        {title: 'Switch organization', hint: 'Fast tenant swap with audit trail.'},
        {title: 'Member management', hint: 'Roles, device posture, SCIM hooks.'},
        {title: 'Drone fleet registry', hint: 'Airframe IDs, firmware tracks.'},
        {title: 'Mission zones', hint: 'Geofenced AOIs + controlled airspace.'},
      ]}
    />
  );
}

export function MissionsStubPanel(): React.JSX.Element {
  return (
    <PhaseStubPanel
      title="Mission Operations"
      subtitle="Plan, rehearse, execute, and debrief missions."
      rows={[
        {title: 'Saved missions', hint: 'Immutable mission bundles + revisions.'},
        {title: 'Simulation center', hint: 'Monte-carlo + hardware-in-loop presets.'},
        {title: 'Mission replay', hint: 'Time-synced telemetry + map scrubber.'},
        {title: 'Offline missions', hint: 'Pre-sync tiles + cached constraints.'},
        {title: 'Recent flights', hint: 'Quick resume + discrepancy markers.'},
      ]}
    />
  );
}

export function SettingsStubPanel(): React.JSX.Element {
  return (
    <PhaseStubPanel
      title="Settings"
      subtitle="Operational preferences that sync across crew devices."
      rows={[
        {title: 'Map', hint: 'Style, elevation exaggeration, collision cones.'},
        {title: 'Telemetry', hint: 'Streams, rates, MAVLink dialects.'},
        {title: 'Theme', hint: 'Night HUD, contrast, red-light cockpit mode.'},
        {title: 'Offline cache', hint: 'Tile budgets + LRU eviction policies.'},
        {title: 'Emergency preferences', hint: 'RTL gates, geofence breaches.'},
      ]}
    />
  );
}
