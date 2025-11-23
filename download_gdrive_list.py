import os
import io
import time
import pickle
from tqdm import tqdm
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Google Drive read-only scope
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

def authenticate():
    """Authenticate via OAuth2 and return a Google Drive API service."""
    creds = None
    if os.path.exists("token.pickle"):
        with open("token.pickle", "rb") as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        with open("token.pickle", "wb") as token:
            pickle.dump(creds, token)

    return build("drive", "v3", credentials=creds)

def extract_file_id(url_or_id):
    """Extract the file ID from a Google Drive URL or return it directly."""
    if "drive.google.com" in url_or_id:
        parts = url_or_id.split("/")
        if "d" in parts:
            return parts[parts.index("d") + 1]
        elif "id=" in url_or_id:
            return url_or_id.split("id=")[-1].split("&")[0]
    return url_or_id

def download_file(service, file_id, output_folder, retries=3):
    """
    Downloads a single file from Google Drive.
    Returns (success, file_name, expected_size, actual_size)
    """
    try:
        file = service.files().get(fileId=file_id, fields="name, size").execute()
        file_name = file["name"]
        expected_size = int(file.get("size", 0))
        file_path = os.path.join(output_folder, file_name)

        # Skip existing complete files
        if os.path.exists(file_path) and os.path.getsize(file_path) >= expected_size:
            print(f"✅ Skipping {file_name} (already complete)")
            return True, file_name, expected_size, os.path.getsize(file_path)

        request = service.files().get_media(fileId=file_id)
        with io.FileIO(file_path, "wb") as fh:
            downloader = MediaIoBaseDownload(fh, request, chunksize=1024 * 1024 * 50)  # 50 MB chunks

            done = False
            last_progress = 0
            pbar = tqdm(total=expected_size, unit="B", unit_scale=True, desc=file_name)

            while not done:
                status, done = downloader.next_chunk()
                if status:
                    progress = status.resumable_progress
                    pbar.update(progress - last_progress)
                    last_progress = progress
            pbar.close()

        actual_size = os.path.getsize(file_path)
        if expected_size and actual_size < expected_size:
            raise IOError(f"Incomplete download ({actual_size}/{expected_size})")

        print(f"✅ Downloaded: {file_name}")
        return True, file_name, expected_size, actual_size

    except Exception as e:
        print(f"❌ Error downloading {file_id}: {e}")
        if retries > 0:
            print(f"⏳ Retrying... ({retries} retries left)")
            time.sleep(3)
            return download_file(service, file_id, output_folder, retries - 1)

        # If still failing, delete partial file
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Deleted incomplete file: {file_name}")
        return False, file_name if 'file_name' in locals() else None, 0, 0

def download_from_list(links_file, output_folder="downloads", failed_log="failed_downloads.txt"):
    """Download all missing files; delete failed/incomplete ones and log them."""
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    service = authenticate()

    with open(links_file, "r") as f:
        links = [line.strip() for line in f if line.strip()]

    failed = []

    for i, link in enumerate(links, start=1):
        file_id = extract_file_id(link)
        print(f"\n[{i}/{len(links)}] Downloading file ID: {file_id}")

        success, name, expected, actual = download_file(service, file_id, output_folder)

        # Mark failed or incomplete files
        if not success or (expected and actual < expected):
            failed.append(link)
            print(f"⚠️ Logged failed file: {name or file_id}")

    # Save failed links
    if failed:
        with open(failed_log, "a") as f:
            f.write("\n".join(failed) + "\n")
        print(f"\n⚠️ {len(failed)} files failed and were deleted. Logged to '{failed_log}'")
    else:
        print("\n✅ All missing files downloaded successfully!")

if __name__ == "__main__":
    # Usage:
    # 1. Add Google Drive links or file IDs to 'Anno1800.txt'
    # 2. Run: python download_drive_api.py
    download_from_list("links.txt")
