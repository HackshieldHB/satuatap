import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { prisma } from "@satu-atap/db";
import { buildAclFile, type DeviceAclEntry } from "./mqtt-acl.js";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIR = path.join(ROOT, "infrastructure", "mosquitto", "generated");
const PASSWD_PATH = path.join(GENERATED_DIR, "passwd");
const ACL_PATH = path.join(GENERATED_DIR, "acl");
const DEV_PASSWORDS_PATH = path.join(GENERATED_DIR, "dev-passwords.json");

type DevPasswords = Record<string, string>;

async function loadDevPasswords(): Promise<DevPasswords> {
  try {
    const raw = await readFile(DEV_PASSWORDS_PATH, "utf8");
    return JSON.parse(raw) as DevPasswords;
  } catch {
    return {};
  }
}

async function mosquittoPasswd(
  username: string,
  password: string,
  create: boolean
): Promise<void> {
  const mount = GENERATED_DIR.replace(/\\/g, "/");
  const args = [
    "run",
    "--rm",
    "-v",
    `${mount}:/mosquitto/config`,
    "eclipse-mosquitto:2",
    "mosquitto_passwd",
    "-b",
    ...(create ? (["-c"] as const) : []),
    "/mosquitto/config/passwd",
    username,
    password,
  ];
  await execFileAsync("docker", args, { timeout: 60_000 });
}

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });

  const gatewayUsername = process.env.MQTT_USERNAME ?? "gateway";
  const gatewayPassword = process.env.MQTT_PASSWORD ?? "local-dev-mqtt-gateway";
  const simulatorUsername = process.env.MQTT_SIMULATOR_USERNAME ?? "simulator";
  const simulatorPassword =
    process.env.MQTT_SIMULATOR_PASSWORD ?? "local-dev-mqtt-simulator";
  const simulatorHomeId = process.env.HOME_ID ?? "home-1";

  const credentials = await prisma.deviceCredential.findMany({
    include: { device: { select: { id: true, homeId: true, nodeId: true } } },
  });

  const plaintext = await loadDevPasswords();
  const devices: DeviceAclEntry[] = [];
  const users: Array<{ username: string; password: string }> = [];

  for (const row of credentials) {
    const deviceId = row.device.id;
    const password = plaintext[row.mqttUsername] ?? plaintext[deviceId];
    if (!password) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Missing plaintext MQTT password for device; re-run db:seed",
          mqttUsername: row.mqttUsername,
          deviceId,
        })
      );
      continue;
    }
    if (!row.device.nodeId) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Device has no nodeId; skipping ACL entry",
          deviceId,
        })
      );
      continue;
    }
    devices.push({
      username: row.mqttUsername,
      homeId: row.device.homeId,
      deviceId,
      nodeId: row.device.nodeId,
    });
    users.push({ username: row.mqttUsername, password });
  }

  users.push({ username: gatewayUsername, password: gatewayPassword });
  users.push({ username: simulatorUsername, password: simulatorPassword });

  const acl = buildAclFile(devices, {
    gatewayUsername,
    simulatorUsername,
    simulatorHomeId,
  });
  await writeFile(ACL_PATH, acl, "utf8");
  console.log(JSON.stringify({ level: "info", msg: "Wrote Mosquitto ACL", path: ACL_PATH }));

  let passwdOk = true;
  try {
    for (let i = 0; i < users.length; i++) {
      await mosquittoPasswd(users[i].username, users[i].password, i === 0);
    }
    console.log(
      JSON.stringify({ level: "info", msg: "Wrote Mosquitto password file", path: PASSWD_PATH })
    );
  } catch (err) {
    passwdOk = false;
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to hash Mosquitto passwords via docker mosquitto_passwd",
        error: message,
        hint: "ACL was written. Start Docker Desktop and re-run npm run mqtt:users to generate passwd.",
      })
    );
    await writeFile(
      PASSWD_PATH,
      "# ERROR: mosquitto_passwd hashing failed. Re-run npm run mqtt:users with Docker available.\n",
      "utf8"
    );
  }

  await prisma.$disconnect();
  if (!passwdOk) process.exitCode = 1;
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
