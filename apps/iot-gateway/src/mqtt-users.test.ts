import { access, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAclFile } from "../../../scripts/mqtt-acl.js";
import {
  ACL_FILENAME,
  generatePasswdFile,
  LEGACY_DEV_PASSWORDS_FILENAME,
  migrateAndLoadDevPasswords,
  PASSWD_FILENAME,
  PASSWD_TEMP_FILENAME,
  writeDevPasswords,
} from "../../../scripts/mqtt-users.js";

const dirs: string[] = [];

async function scratchDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "satuatap-mqtt-passwd-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const users = [
  { username: "gateway", password: "secret" },
  { username: "simulator", password: "secret" },
];

describe("mqtt passwd generation", () => {
  it("leaves no passwd file when a run fails", async () => {
    const dir = await scratchDir();
    const passwdPath = path.join(dir, PASSWD_FILENAME);
    const tempPath = path.join(dir, PASSWD_TEMP_FILENAME);
    await writeFile(passwdPath, "poisoned-placeholder\n", "utf8");

    await expect(
      generatePasswdFile({
        generatedDir: dir,
        users,
        ensureReady: async () => {
          throw new Error(
            "Docker is not responding. Start Docker Desktop and re-run npm run mqtt:users."
          );
        },
        hashUser: async () => {
          throw new Error("hash should not run");
        },
        chmodPasswd: async () => undefined,
      })
    ).rejects.toThrow(/Docker is not responding/);

    await expect(access(passwdPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(tempPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves no passwd file when hashing fails mid-run", async () => {
    const dir = await scratchDir();
    const passwdPath = path.join(dir, PASSWD_FILENAME);
    const tempPath = path.join(dir, PASSWD_TEMP_FILENAME);

    await expect(
      generatePasswdFile({
        generatedDir: dir,
        users,
        ensureReady: async () => undefined,
        hashUser: async (_u, _p, create, destFileName) => {
          if (create) {
            await writeFile(path.join(dir, destFileName), "partial\n", "utf8");
            return;
          }
          throw new Error("mosquitto_passwd hashing failed");
        },
        chmodPasswd: async () => undefined,
      })
    ).rejects.toThrow(/mosquitto_passwd hashing failed/);

    await expect(access(passwdPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(tempPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails loudly if the chmod step fails", async () => {
    const dir = await scratchDir();
    const passwdPath = path.join(dir, PASSWD_FILENAME);

    await expect(
      generatePasswdFile({
        generatedDir: dir,
        users,
        ensureReady: async () => undefined,
        hashUser: async (_u, _p, create, destFileName) => {
          if (create) {
            await writeFile(path.join(dir, destFileName), "hashed\n", "utf8");
          }
        },
        chmodPasswd: async () => {
          throw new Error(
            "Failed to chmod 0644 on the Mosquitto password file inside Docker. The broker runs as uid 1883 and cannot read a 0600 root-owned file. Re-run npm run mqtt:users."
          );
        },
      })
    ).rejects.toThrow(/chmod 0644/);

    await expect(access(passwdPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes no file other than passwd and acl into the mosquitto generated directory", async () => {
    const generatedDir = await scratchDir();
    const secretsDir = await scratchDir();
    const secretsPath = path.join(secretsDir, "mqtt-dev-passwords.json");
    const legacyPath = path.join(generatedDir, LEGACY_DEV_PASSWORDS_FILENAME);

    await writeFile(legacyPath, JSON.stringify({ "energy-main": "old-secret" }) + "\n", "utf8");
    await migrateAndLoadDevPasswords({ secretsPath, legacyPath });
    await writeDevPasswords({ "energy-main": "new-secret" }, { secretsPath, legacyPath });

    await writeFile(
      path.join(generatedDir, ACL_FILENAME),
      buildAclFile(
        [
          {
            username: "energy-main",
            homeId: "home-1",
            deviceId: "energy-main",
            nodeId: "esp32-energy-001",
          },
        ],
        {
          gatewayUsername: "gateway",
          simulatorUsername: "simulator",
          simulatorHomeId: "home-1",
        }
      ),
      "utf8"
    );

    await generatePasswdFile({
      generatedDir,
      users,
      ensureReady: async () => undefined,
      hashUser: async (_u, _p, create, destFileName) => {
        if (create) {
          await writeFile(path.join(generatedDir, destFileName), "hashed\n", "utf8");
        }
      },
      chmodPasswd: async () => undefined,
    });

    const names = (await readdir(generatedDir)).sort();
    expect(names).toEqual([ACL_FILENAME, PASSWD_FILENAME].sort());
    await expect(access(legacyPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(secretsPath)).resolves.toBeUndefined();
  });
});
