import fs from "node:fs";
import path from "node:path";

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import cliProgress from "cli-progress";
import { authorize } from "./auth";

function extractFileId(urlOrId: string): string {
  if (urlOrId.includes("drive.google.com")) {
    const parts = urlOrId.split("/");
    const dIndex = parts.indexOf("d");
    if (dIndex !== -1 && dIndex + 1 < parts.length) {
      return parts[dIndex + 1];
    }
    if (urlOrId.includes("id=")) {
      const match = urlOrId.match(/id=([^&]+)/);
      if (match) return match[1];
    }
  }
  return urlOrId;
}

export async function downloadFile(
  auth: OAuth2Client,
  fileId: string,
  outputFolder: string,
  retries = 3,
): Promise<{
  success: boolean;
  fileName?: string;
  expectedSize: number;
  actualSize: number;
}> {
  const drive = google.drive({ version: "v3", auth });

  try {
    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "name, size",
    });

    const fileName = fileMetadata.data.name || `file_${fileId}`;
    const expectedSize = parseInt(fileMetadata.data.size || "0", 10);
    const filePath = path.join(outputFolder, fileName);

    // Skip existing complete files
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size >= expectedSize) {
        console.log(`✅ Skipping ${fileName} (already complete)`);
        return {
          success: true,
          fileName,
          expectedSize,
          actualSize: stats.size,
        };
      }
    }

    console.log(`⬇️  Downloading ${filePath}...`);

    const dest = fs.createWriteStream(filePath);
    const bar = new cliProgress.SingleBar(
      {
        stream: process.stdout,
        noTTYOutput: false,
      },
      cliProgress.Presets.shades_classic,
    );
    bar.start(expectedSize, 0);

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

    let downloadedBytes = 0;

    return new Promise((resolve, reject) => {
      res.data
        .on("data", (chunk: any) => {
          downloadedBytes += chunk.length;
          bar.update(downloadedBytes);
        })
        .on("end", () => {
          bar.stop();
          console.log(`\n✅ Downloaded: ${fileName}`);
          const actualSize = fs.statSync(filePath).size;
          if (expectedSize && actualSize < expectedSize) {
            // Incomplete download
            console.error(
              `❌ Incomplete download (${actualSize}/${expectedSize})`,
            );
            resolve({
              success: false,
              fileName,
              expectedSize,
              actualSize,
            });
          } else {
            resolve({
              success: true,
              fileName,
              expectedSize,
              actualSize,
            });
          }
        })
        .on("error", (err: any) => {
          bar.stop();
          console.error(`❌ Error downloading ${fileId}: ${err.message}`);
          dest.close();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Delete partial
          reject(err);
        })
        .pipe(dest);
    });
  } catch (error: any) {
    console.error(`❌ Error processing ${fileId}: ${error.message}`);
    if (retries > 0) {
      console.log(`⏳ Retrying... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, 3000));
      return downloadFile(auth, fileId, outputFolder, retries - 1);
    }
    return {
      success: false,
      fileName: undefined,
      expectedSize: 0,
      actualSize: 0,
    };
  }
}

export async function downloadFromList(
  links: string[],
  outputFolder: string,
  failedLog = "failed_downloads.txt",
) {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const auth = await authorize();

  //   const content = fs.readFileSync(linksFile, "utf-8");
  //   const links = content
  //     .split("\n")
  //     .map((line) => line.trim())
  //     .filter((line) => line.length > 0);

  const failed: string[] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const fileId = extractFileId(link);
    console.log(`\n[${i + 1}/${links.length}] Downloading file ID: ${fileId}`);

    const result = await downloadFile(auth, fileId, outputFolder);

    if (
      !result.success ||
      (result.expectedSize > 0 && result.actualSize < result.expectedSize)
    ) {
      failed.push(link);
      console.log(`⚠️ Logged failed file: ${result.fileName || fileId}`);
    }
  }

  if (failed.length > 0) {
    fs.appendFileSync(failedLog, failed.join("\n") + "\n");
    console.log(`\n⚠️ ${failed.length} files failed. Logged to '${failedLog}'`);
  } else {
    console.log("\n✅ All missing files downloaded successfully!");
  }
}

// // Main execution
// const LINKS_FILE = "links.txt";
// if (fs.existsSync(LINKS_FILE)) {
//   downloadFromList(LINKS_FILE).catch(console.error);
// } else {
//   console.error(`File ${LINKS_FILE} not found.`);
// }
