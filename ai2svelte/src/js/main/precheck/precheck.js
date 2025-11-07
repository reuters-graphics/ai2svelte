import { evalTS } from "../../lib/utils/bolt";
import { version as pluginVersion } from "../../../shared/shared";
import { readFile, writeFile } from "../utils/utils";
import pluginFlags from "./flags.json?json";

let userFlags = {};

function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  const length = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1; // v1 is newer
    if (num1 < num2) return -1; // v2 is newer
  }

  return 0; // versions are equal
}

function checkFlagsFile() {
  userFlags = readFile(".flags.json");
  console.log("User Flags:", userFlags);

  if (userFlags == null || Object.keys(userFlags).length == 0) {
    const success = writeFile(".flags.json", pluginFlags);
    if (success) {
      userFlags = readFile(".flags.json");
      console.log("Flags file created successfully.");
    }
  }
}

async function checkVersion() {
  let fileVersion = await evalTS("getVariable", "version");
  if (Object.keys(fileVersion).length === 0 || fileVersion == null) {
    fileVersion = "1.0.1";
  } else {
    fileVersion = fileVersion.version;
  }

  console.log(
    `fileVersion: ${JSON.stringify(fileVersion)}, pluginVersion: ${pluginVersion}`
  );

  let comparison = compareVersions(pluginVersion, fileVersion);

  let usersProfile = readFile("user-profiles.json");
  let usersDefaultProfile =
    usersProfile && Object.keys(usersProfile).length
      ? usersProfile.default
      : null;

  if (
    pluginVersion === "1.0.2" &&
    usersDefaultProfile &&
    usersDefaultProfile.responsiveness &&
    usersDefaultProfile.responsiveness === "fixed" &&
    userFlags &&
    userFlags["1.0.2"]?.fixedToDynamicResponsiveness == false
  ) {
    const response = confirm(
      "To align with internal standards, we suggest updating your default profile’s responsiveness setting from fixed to dynamic. Do you want to proceed with this change?"
    );

    if (response) {
      const newProfile = { ...usersDefaultProfile, responsiveness: "dynamic" };
      const success = writeFile("user-profiles.json", { default: newProfile });

      if (success) {
        alert(
          "Default profile updated successfully. Please run ai2svelte for this file with responsiveness: dynamic to apply the changes."
        );
      }
    }

    console.log(userFlags["1.0.2"]?.fixedToDynamicResponsiveness);
    userFlags["1.0.2"].fixedToDynamicResponsiveness = true;
    writeFile(".flags.json", userFlags);
  }

  if (comparison < 0) {
    alert(
      `This file was created with a newer version (v${fileVersion}) than the one you are currently using (v${pluginVersion}). Some features may not work as expected. Please update to the latest version for the best experience.`
    );
  }
}

export function precheck() {
  checkFlagsFile();
  checkVersion();
}
