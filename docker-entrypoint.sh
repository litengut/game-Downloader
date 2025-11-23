#!/bin/sh
set -e

# Auto-detect permissions from /mnt/games if PUID/PGID are not set
if [ -d "/mnt/games" ]; then
    MOUNT_UID=$(stat -c '%u' /mnt/games)
    MOUNT_GID=$(stat -c '%g' /mnt/games)
    echo "Detected /mnt/games owner: UID=$MOUNT_UID, GID=$MOUNT_GID"

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

# Ensure the app directory is owned by the user
chown -R "$PUID:$PGID" /usr/src/app

# Execute the command as the user:group
exec gosu "$PUID:$PGID" "$@"
