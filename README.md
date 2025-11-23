# Game Downloader (TypeScript/Bun)

This is a TypeScript port of the Python Google Drive downloader script, using Bun.

## Prerequisites

- [Bun](https://bun.sh/) installed.
- `credentials.json` from Google Cloud Console (OAuth 2.0 Client ID) in the project root.

## Setup

1.  Install dependencies:

    ```bash
    bun install
    ```

2.  Ensure `links.txt` exists with the Google Drive links you want to download.

## Usage

Run the downloader:

```bash
bun run index.ts
```

## Notes

- The script uses `token.json` to store authentication tokens (instead of `token.pickle` used by the Python script).
- If you have authentication issues, delete `token.json` and run the script again to re-authenticate.
- Downloads are saved to the `downloads` folder.
- Failed downloads are logged to `failed_downloads.txt`.
