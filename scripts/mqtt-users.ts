import { execFile } from "node:child_process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildAclFile, type DeviceAclEntry } from "./mqtt-acl.js";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIR = path.join(ROOT, "infrastructure", "mosquitto", "generated");
export const PASSWD_FILENAME = "passwd";
export const PASSWD_TEMP_FILENAME = "passwd.tmp";
export const ACL_FILENAME = "acl";
export const LEGACY_DEV_PASSWORDS_FILENAME = "dev-passwords.json";
const PASSWD_PATH = path.join(GENERATED_DIR, PASSWD_FILENAME);
const ACL_PATH = path.join(GENERATED_DIR, ACL_FILENAME);
export const DEV_PASSWORDS_PATH = path.join(ROOT, ".secrets", "mqtt-dev-passwords.json");
export const LEGACY_DEV_PASSWORDS_PATH = path.join(GENERATED_DIR, LEGACY_DEV_PASSWORDS_FILENAME);
export const MOSQUITTO_IMAGE = "eclipse-mosquitto:2";
export const PASSWD_FILE_MODE = "0644";

type DevPasswords = Record<string, string>;

export async function removeIfExists(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

export async function ensureMosquittoPasswdPrereqs(
  execDocker: typeof execFileAsync = execFileAsync
): Promise<void> {
  try {
    await execDocker("docker", ["info"], { timeout: 20_000 });
  } catch {
    throw new Error(
      "Docker is not responding. Start Docker Desktop and re-run npm run mqtt:users."
    );
  }
  try {
    await execDocker("docker", ["image", "inspect", MOSQUITTO_IMAGE], { timeout: 20_000 });
  } catch {
    throw new Error(
      `Docker image ${MOSQUITTO_IMAGE} is not available. Pull it with \`docker pull ${MOSQUITTO_IMAGE}\` and re-run npm run mqtt:users.`
    );
  }
}

function dockerBind(generatedDir: string): string {
  return generatedDir.replace(/\\/g, "/");
}

async function mosquittoPasswd(
  username: string,
  password: string,
  create: boolean,
  destFileName: string,
  generatedDir: string
): Promise<void> {
  const mount = dockerBind(generatedDir);
  const args = [
    "run",
    "--rm",
    "-v",
    `${mount}:/mosquitto/config`,
    MOSQUITTO_IMAGE,
    "mosquitto_passwd",
    "-b",
    ...(create ? (["-c"] as const) : []),
    `/mosquitto/config/${destFileName}`,
    username,
    password,
  ];
  await execFileAsync("docker", args, { timeout: 60_000 });
}

export async function chmodPasswdInContainer(
  generatedDir: string,
  passwdFileName: string,
  execDocker: typeof execFileAsync = execFileAsync
): Promise<void> {
  const mount = dockerBind(generatedDir);
  try {
    await execDocker(
      "docker",
      [
        "run",
        "--rm",
        "--user",
        "0",
        "--entrypoint",
        "/bin/chmod",
        "-v",
        `${mount}:/mosquitto/config`,
        MOSQUITTO_IMAGE,
        PASSWD_FILE_MODE,
        `/mosquitto/config/${passwdFileName}`,
      ],
      { timeout: 20_000 }
    );
  } catch {
    throw new Error(
      `Failed to chmod ${PASSWD_FILE_MODE} on the Mosquitto password file inside Docker. The broker runs as uid 1883 and cannot read a 0600 root-owned file. Re-run npm run mqtt:users.`
    );
  }
}

export async function generatePasswdFile(options: {
  generatedDir: string;
  users: Array<{ username: string; password: string }>;
  ensureReady: () => Promise<void>;
  hashUser: (
    username: string,
    password: string,
    create: boolean,
    destFileName: string
  ) => Promise<void>;
  chmodPasswd: (passwdFileName: string) => Promise<void>;
  passwdFileName?: string;
  tempFileName?: string;
}): Promise<void> {
  const passwdFileName = options.passwdFileName ?? PASSWD_FILENAME;
  const tempFileName = options.tempFileName ?? PASSWD_TEMP_FILENAME;
  const passwdPath = path.join(options.generatedDir, passwdFileName);
  const tempPath = path.join(options.generatedDir, tempFileName);

  const discardPasswdArtifacts = async () => {
    await removeIfExists(passwdPath);
    await removeIfExists(tempPath);
  };

  try {
    await options.ensureReady();
    await discardPasswdArtifacts();
    for (let i = 0; i < options.users.length; i++) {
      await options.hashUser(options.users[i].username, options.users[i].password, i === 0, tempFileName);
    }
    await rename(tempPath, passwdPath);
    await options.chmodPasswd(passwdFileName);
  } catch (err) {
    await discardPasswdArtifacts();
    throw err;
  }
}

export async function migrateAndLoadDevPasswords(options?: {
  secretsPath?: string;
  legacyPath?: string;
}): Promise<DevPasswords> {
  const secretsPath = options?.secretsPath ?? DEV_PASSWORDS_PATH;
  const legacyPath = options?.legacyPath ?? LEGACY_DEV_PASSWORDS_PATH;
  await mkdir(path.dirname(secretsPath), { recursive: true });

  const hasSecrets = await pathExists(secretsPath);
  const hasLegacy = await pathExists(legacyPath);

  if (hasLegacy && !hasSecrets) {
    await rename(legacyPath, secretsPath);
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Migrated MQTT plaintext passwords out of the Mosquitto bind mount",
        from: legacyPath,
        to: secretsPath,
      })
    );
  } else if (hasLegacy) {
    await removeIfExists(legacyPath);
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Removed stale MQTT plaintext passwords from the Mosquitto bind mount",
        path: legacyPath,
      })
    );
  }

  try {
    const raw = await readFile(secretsPath, "utf8");
    return JSON.parse(raw) as DevPasswords;
  } catch {
    return {};
  }
}

export async function writeDevPasswords(
  passwords: DevPasswords,
  options?: { secretsPath?: string; legacyPath?: string }
): Promise<void> {
  const secretsPath = options?.secretsPath ?? DEV_PASSWORDS_PATH;
  const legacyPath = options?.legacyPath ?? LEGACY_DEV_PASSWORDS_PATH;
  await mkdir(path.dirname(secretsPath), { recursive: true });
  await writeFile(secretsPath, JSON.stringify(passwords, null, 2) + "\n", "utf8");
  await removeIfExists(legacyPath);
}

async function main() {
  const { prisma } = await import("@satu-atap/db");
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

  const plaintext = await migrateAndLoadDevPasswords();
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
    await generatePasswdFile({
      generatedDir: GENERATED_DIR,
      users,
      ensureReady: () => ensureMosquittoPasswdPrereqs(),
      hashUser: (username, password, create, destFileName) =>
        mosquittoPasswd(username, password, create, destFileName, GENERATED_DIR),
      chmodPasswd: (passwdFileName) => chmodPasswdInContainer(GENERATED_DIR, passwdFileName),
    });
    console.log(
      JSON.stringify({ level: "info", msg: "Wrote Mosquitto password file", path: PASSWD_PATH })
    );
  } catch (err) {
    passwdOk = false;
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to generate a broker-readable Mosquitto password file",
        error: message,
        hint: "ACL was written. No unreadable password file was left behind. Start Docker Desktop and re-run npm run mqtt:users.",
      })
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
    try {
      const { prisma } = await import("@satu-atap/db");
      await prisma.$disconnect();
    } catch {
      // ignore disconnect failures after a crash
    }
    process.exit(1);
  });
}
