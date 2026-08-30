import { describe, expect, it } from "vitest";
import { aclAllows, buildAclFile, parseAclFile } from "../../../scripts/mqtt-acl.js";

const aclText = buildAclFile(
  [
    {
      username: "energy-main",
      homeId: "home-1",
      deviceId: "energy-main",
      nodeId: "esp32-energy-001",
    },
    {
      username: "light-living-room",
      homeId: "home-1",
      deviceId: "light-living-room",
      nodeId: "esp32-lighting-001",
    },
  ],
  {
    gatewayUsername: "gateway",
    simulatorUsername: "simulator",
    simulatorHomeId: "home-1",
  }
);

const acl = parseAclFile(aclText);

describe("MQTT ACL policy", () => {
  it("allows a device to write its own telemetry and denies another device's topics", () => {
    expect(
      aclAllows(acl, "energy-main", "write", "home/home-1/device/energy-main/telemetry")
    ).toBe(true);
    expect(
      aclAllows(acl, "energy-main", "write", "home/home-1/device/light-living-room/telemetry")
    ).toBe(false);
    expect(
      aclAllows(acl, "energy-main", "write", "home/home-1/device/light-living-room/command")
    ).toBe(false);
  });

  it("denies command writes from device credentials", () => {
    expect(
      aclAllows(acl, "energy-main", "write", "home/home-1/device/energy-main/command")
    ).toBe(false);
    expect(
      aclAllows(acl, "light-living-room", "write", "home/home-1/device/light-living-room/command")
    ).toBe(false);
    expect(
      aclAllows(acl, "energy-main", "read", "home/home-1/device/energy-main/command")
    ).toBe(true);
  });

  it("lets a node account act for its own devices and not another node's", () => {
    // A node account (one physical board) writes telemetry for every device it hosts...
    expect(
      aclAllows(acl, "esp32-energy-001", "write", "home/home-1/device/energy-main/telemetry")
    ).toBe(true);
    expect(
      aclAllows(acl, "esp32-energy-001", "read", "home/home-1/device/energy-main/command")
    ).toBe(true);
    expect(
      aclAllows(acl, "esp32-energy-001", "write", "home/home-1/node/esp32-energy-001/availability")
    ).toBe(true);
    // ...but never for a device on a different board.
    expect(
      aclAllows(acl, "esp32-energy-001", "write", "home/home-1/device/light-living-room/telemetry")
    ).toBe(false);
    // A node account still cannot publish onto a command topic (only read it).
    expect(
      aclAllows(acl, "esp32-energy-001", "write", "home/home-1/device/energy-main/command")
    ).toBe(false);
  });

  it("lets the gateway write commands and not device telemetry", () => {
    expect(
      aclAllows(acl, "gateway", "write", "home/home-1/device/light-living-room/command")
    ).toBe(true);
    expect(
      aclAllows(acl, "gateway", "write", "home/home-1/device/energy-main/telemetry")
    ).toBe(false);
    expect(
      aclAllows(acl, "gateway", "read", "home/home-1/device/energy-main/telemetry")
    ).toBe(true);
  });
});
