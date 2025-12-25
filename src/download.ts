import fs from "node:fs";
import path from "node:path";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import cliProgress from "cli-progress";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as OAuth2Client;
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client: OAuth2Client): Promise<void> {
  const content = await fs.promises.readFile(CREDENTIALS_PATH, "utf-8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}
