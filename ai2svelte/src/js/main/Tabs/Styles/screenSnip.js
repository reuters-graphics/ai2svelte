import { child_process, path, fs } from "../../../lib/cep/node";
import { csi } from "../../../lib/utils/bolt";
import config from "../../../../../cep.config";
import { stylesState } from "./stylesState.svelte";

let extensionPath = "";
let userDataPath = "";

if (window.cep) {
  extensionPath = csi?.getSystemPath("extension") ?? "";
  userDataPath = csi?.getSystemPath("userData") ?? "";
}

export async function captureRegion() {
  userDataPath = path.isAbsolute(userDataPath)
    ? userDataPath
    : path.join("/", userDataPath);
  const outputPath = path.join(userDataPath, config.id, "screenshot.png");

  const cmd = `screencapture -i '${outputPath}'`;

  await fs.unlink(outputPath, (err) => {
    if (err) throw err;
    console.log("Old screenshot was deleted");
  });

  child_process.exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error capturing screen: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    if (stdout) {
      console.log(`stdout: ${stdout}`);
    }

    await fs.readFile(outputPath, { encoding: "base64" }, (err, data) => {
      // Then push it to our array with the correct metadata prefix
      if (!err) {
        const imgData = `data:image/jpeg;charset=utf-8;base64,${data}`;
        stylesState.backdrop = imgData;
      }
    });

    console.log(`Screenshot saved to ${outputPath}`);
  });
}
