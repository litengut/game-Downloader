import { downloadFromList } from "./download";
import { decryptDLC } from "./decrypt";
import fs from "node:fs";
import path from "node:path";

// Main execution
console.log("start");
const DIR = process.env.GAMES_DIR || "/mnt/games";
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL || "60000", 10);

async function processDirectory(directory: string) {
  console.log(`Scanning ${directory}...`);

  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (e) {
    console.error(`Failed to read directory ${directory}:`, e);
    return;
  }

  // Check for .dlc files in this directory
  const dlcFile = entries.find(
    (entry) => entry.isFile() && entry.name.endsWith(".dlc")
  );
  const linksFile = path.join(directory, "links.txt");

  if (dlcFile) {
    const dlcPath = path.join(directory, dlcFile.name);
    console.log(`Found DLC: ${dlcPath}`);

    if (!fs.existsSync(linksFile)) {
      try {
        console.log(`Decrypting ${dlcFile.name}...`);
        const links = await decryptDLC(dlcPath);
        if (links.length > 0) {
          fs.writeFileSync(linksFile, links.join("\n"));
          console.log(`Saved ${links.length} links to ${linksFile}`);
        } else {
          console.warn(`No links found in ${dlcFile.name}`);
        }
      } catch (err) {
        console.error(`Failed to decrypt ${dlcFile.name}:`, err);
      }
    } else {
      console.log(
        `links.txt already exists in ${directory}, skipping decryption.`
      );
    }
  }

  // If links.txt exists (either from DLC or before), download files
  if (fs.existsSync(linksFile)) {
    console.log(`Processing links.txt in ${directory}`);
    const content = fs.readFileSync(linksFile, "utf-8");
    const links = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (links.length > 0) {
      await downloadFromList(links, directory);
    }
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await processDirectory(path.join(directory, entry.name));
    }
  }
}

async function main() {
  while (true) {
    if (fs.existsSync(DIR)) {
      await processDirectory(DIR).catch(console.error);
    } else {
      console.error(`Directory ${DIR} not found.`);
    }
    console.log(`Waiting ${SCAN_INTERVAL / 1000} seconds before next scan...`);
    await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL));
  }
}

main();
