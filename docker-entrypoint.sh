#!/bin/sh
set -e

GAMES_DIR=${GAMES_DIR:-/mnt/games}

# Auto-detect permissions from GAMES_DIR if PUID/PGID are not set
if [ -d "$GAMES_DIR" ]; then
    MOUNT_UID=$(stat -c '%u' "$GAMES_DIR")
    MOUNT_GID=$(stat -c '%g' "$GAMES_DIR")
    echo "Detected $GAMES_DIR owner: UID=$MOUNT_UID, GID=$MOUNT_GID"
    ls -ld "$GAMES_DIR"

    if [ -z "$PUID" ]; then
        echo "PUID not specified. Using detected UID: $MOUNT_UID"
        PUID="$MOUNT_UID"
    fi

    if [ -z "$PGID" ]; then
        echo "PGID not specified. Using detected GID: $MOUNT_GID"
        PGID="$MOUNT_GID"
    fi
fi

# Default to UID 1000 (bun) if not specified
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting with PUID: $PUID, PGID: $PGID"

# Create group if it doesn't exist
if ! getent group "$PGID" >/dev/null; then
    groupadd -g "$PGID" appgroup
fi

# Create user if it doesn't exist
if ! id -u "$PUID" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -m -s /bin/sh appuser
fi

# Optional: Fix permissions recursively
if [ "${FIX_PERMISSIONS:-false}" = "true" ]; then
    echo "Fixing permissions recursively on $GAMES_DIR..."
    chown -R "$PUID:$PGID" "$GAMES_DIR"
    echo "Permissions fixed."
fi

# Ensure the app directory is owned by the user
chown -R "$PUID:$PGID" /usr/src/app

# Execute the command as the user:group
exec gosu "$PUID:$PGID" "$@"
