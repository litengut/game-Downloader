import fs from "fs";
import path from "path";
// import axios from "axios"; // Removed axios, using fetch instead
import FormData from "form-data";

const DCRYPT_URL = "http://dcrypt.it/";
const UPLOAD_URL = new URL("/decrypt/upload", DCRYPT_URL).toString();
const CONTAINER_URL = new URL("/decrypt/container", DCRYPT_URL).toString();
const CNL_URL = new URL("/decrypt/cnl", DCRYPT_URL).toString();
const PASTE_URL = new URL("/decrypt/paste", DCRYPT_URL).toString();

interface DcryptSuccessResponse {
  success: {
    links: string[];
  };
}

interface DcryptErrorResponse {
  form_errors: {
    dlcfile?: string[];
    [key: string]: string[] | undefined;
  };
}

type DcryptResponse = DcryptSuccessResponse | DcryptErrorResponse;

/**
 * Parse the response body and return links or throw error.
 */
function parseResponseBody(body: string): string[] {
  const clean = body.replace(/<(\/)?textarea>/g, "");

  let json: DcryptResponse;
  try {
    json = JSON.parse(clean);
  } catch {
    throw new Error("Invalid JSON response from dcrypt.it");
  }

  if ("form_errors" in json && json.form_errors?.dlcfile?.length) {
    throw new Error(json.form_errors.dlcfile[0]);
  }

  if ("success" in json && Array.isArray(json.success.links)) {
    return json.success.links;
  }

  throw new Error("Malformed response from dcrypt.it");
}

/**
 * Upload a DLC file and decrypt it.
 */
export async function upload(inputFilepath: string): Promise<string[]> {
  const filepath = path.isAbsolute(inputFilepath)
    ? inputFilepath
    : path.resolve(process.cwd(), inputFilepath);

  const filename = path.basename(filepath);

  const form = new FormData();
  form.append("dlcfile", fs.createReadStream(filepath), {
    filename,
    contentType: "application/octet-stream",
  });

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: form as any,
    headers: (form as any).getHeaders(),
  });
  const text = await response.text();
  return parseResponseBody(text);
}

/**
 * Decrypt a container via URL.
 */
export async function container(link: string): Promise<string[]> {
  const form = new FormData();
  form.append("link", link);

  const response = await fetch(CONTAINER_URL, {
    method: "POST",
    body: form as any,
    headers: (form as any).getHeaders(),
  });
  const text = await response.text();
  return parseResponseBody(text);
}

/**
 * Decrypt raw pasted container content.
 */
export async function paste(content: string): Promise<string[]> {
  const form = new FormData();
  form.append("content", content);

  const response = await fetch(PASTE_URL, {
    method: "POST",
    body: form as any,
    headers: (form as any).getHeaders(),
  });
  const text = await response.text();
  return parseResponseBody(text);
}
