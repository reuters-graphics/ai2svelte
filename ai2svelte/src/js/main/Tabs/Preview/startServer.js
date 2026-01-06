import { child_process, fs, path, process } from "../../../lib/cep/node";
import { csi } from "../../../lib/utils/bolt";
import config from "../../../../../cep.config";

let extensionPath = "";
let userDataPath = "";

if (window.cep) {
  extensionPath = csi?.getSystemPath("extension") ?? "";
  userDataPath = csi?.getSystemPath("userData") ?? "";
}

let serverProcess = null;

const spawn = child_process.spawn;

export async function compileComponent() {
  console.log("Starting Vite server...");
  const serverPath = path.join(extensionPath, "server.cjs");

  userDataPath = path.isAbsolute(userDataPath)
    ? userDataPath
    : path.join("/", userDataPath);

  const writableEntryPath = path.join(
    userDataPath,
    config.id,
    "writable",
    "previewWrapper.js"
  );

  const writableOutputPath = path.join(
    userDataPath,
    config.id,
    "writable",
    "previewComponent.js"
  );

  serverProcess = spawn(
    "node",
    [serverPath, writableEntryPath, writableOutputPath],
    {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    }
  );

  console.log("Started server with PID:", serverProcess.pid);

  // Forward child stdout/stderr to CEP DevTools console
  serverProcess.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    text.split(/\r?\n/).forEach((line) => {
      if (line.trim().length) console.log("%c[server]", "color:#888", line);
    });
  });

  serverProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    text.split(/\r?\n/).forEach((line) => {
      if (line.trim().length) console.error("%c[server]", "color:#c00", line);
    });
  });

  serverProcess.stdin.on("data", (chunk) => {
    const text = chunk.toString();
    text.split(/\r?\n/).forEach((line) => {
      if (line.trim().length) console.log("%c[server]", "color:#888", line);
    });
  });

  serverProcess.on("exit", (code, signal) => {
    console.log(`Server exited. code=${code} signal=${signal}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start server process:", err);
  });
}
