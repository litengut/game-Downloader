import fs from "node:fs";
import axios from "axios";
import FormData from "form-data";

export async function decryptDLC(filePath: string): Promise<string[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const form = new FormData();
  form.append("dlcfile", fs.createReadStream(filePath));

  try {
    const response = await axios.post("http://dcrypt.it/decrypt/upload", form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const data = response.data;

    // If the API returns JSON with a 'links' property (some versions might)
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data.links)) {
        return data.links;
      }
      // Sometimes it might be in a different field
      if (data.success && data.content) {
        // parse content if it's a string of links
        const content = data.content;
        if (typeof content === "string") {
          return content
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        }
      }
    }

    // Fallback: Parse HTML/Text for links
    const text = typeof data === "string" ? data : JSON.stringify(data);

    // Regex to find URLs.
    // We look for http or https links.
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const matches = text.match(urlRegex);

    if (matches) {
      // Filter out dcrypt.it internal links and other noise
      const uniqueLinks = [...new Set(matches)];
      return uniqueLinks.filter((link) => {
        return (
          !link.includes("dcrypt.it") &&
          !link.includes("w3.org") &&
          !link.includes("jquery")
        );
      });
    }

    return [];
  } catch (error) {
    console.error("Error decrypting DLC:", error);
    throw error;
  }
}
