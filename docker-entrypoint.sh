#!/bin/sh
set -e

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

# Get the username for the PUID
USERNAME=$(getent passwd "$PUID" | cut -d: -f1)

# Ensure the app directory is owned by the user
chown -R "$PUID:$PGID" /usr/src/app

# Execute the command as the user
exec gosu "$USERNAME" "$@"
