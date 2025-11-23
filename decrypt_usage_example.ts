import { decryptDLC } from "./src/decrypt";
import path from "path";

async function main() {
  const dlcPath = process.argv[2];
  if (!dlcPath) {
    console.error("Please provide a path to a .dlc file");
    process.exit(1);
  }

  try {
    console.log(`Decrypting ${dlcPath}...`);
    const links = await decryptDLC(dlcPath);
    console.log("Found links:");
    links.forEach((link) => console.log(link));
  } catch (error) {
    console.error("Failed to decrypt:", error);
  }
}

main();
