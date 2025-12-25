import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

/**
 * Downloads a file from Google Drive.
 * @param {string} fileId The ID of the file to download.
 * @return {Promise<number>} The status of the download.
 */
async function downloadFile(fileId: string) {
  // Authenticate with Google and get an authorized client.
  // TODO (developer): Use an appropriate auth mechanism for your app.
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/drive",
  });

  // Create a new Drive API client (v3).
  const service = google.drive({ version: "v3", auth });

  // Download the file.
  const file = await service.files.get({
    fileId,
    alt: "media",
  });

  // Print the status of the download.
  console.log(file.status);
  return file.status;
}

downloadFile("1Ntsx6M1ZUH735XR8dHoEg3BhQPG1HjON");
