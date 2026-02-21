#!/usr/bin/env bash
# ─── Blimp Agent - macOS Installer ───────────────────────────────────────────
# Installs the Blimp agent as a LaunchDaemon so it runs at boot and
# exposes a local HTTP API on http://localhost:51723
#
# Requirements: Python 3.9+ (bundled with macOS 12+)
# Usage:  sudo bash install-macos.sh

set -euo pipefail

AGENT_VERSION="1.0.0"
INSTALL_DIR="/usr/local/blimp-agent"
PLIST_PATH="/Library/LaunchDaemons/com.blimp.agent.plist"
LOG_DIR="/var/log/blimp-agent"
AGENT_PORT=51723

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLU}→${NC} $*"; }
success() { echo -e "${GRN}✓${NC} $*"; }
warn()    { echo -e "${YLW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

[ "$(uname)" = "Darwin" ] || error "This installer is for macOS only."
[ "$EUID" -eq 0 ] || error "Please run with sudo: sudo bash install-macos.sh"

echo ""
echo "  Blimp Agent v${AGENT_VERSION} — macOS Installer"
echo "  ─────────────────────────────────────────────"
echo ""

# Detect Python 3
PYTHON=""
for candidate in python3 /usr/bin/python3 /usr/local/bin/python3; do
    if command -v "$candidate" &>/dev/null; then
        PYVER=$("$candidate" --version 2>&1 | awk '{print $2}')
        PYMAJOR=$(echo "$PYVER" | cut -d. -f1)
        PYMINOR=$(echo "$PYVER" | cut -d. -f2)
        if [ "$PYMAJOR" -ge 3 ] && [ "$PYMINOR" -ge 9 ]; then
            PYTHON="$candidate"
            break
        fi
    fi
done
[ -n "$PYTHON" ] || error "Python 3.9+ is required. Install from https://python.org"
success "Found Python at $PYTHON ($PYVER)"

# Create install directory
info "Creating $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp "$(dirname "$0")/blimp_agent.py" "$INSTALL_DIR/blimp_agent.py"
chmod 644 "$INSTALL_DIR/blimp_agent.py"
success "Agent installed to $INSTALL_DIR"

# Create log directory
mkdir -p "$LOG_DIR"
success "Log directory: $LOG_DIR"

# Write LaunchDaemon plist
info "Installing LaunchDaemon..."
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.blimp.agent</string>

    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON}</string>
        <string>${INSTALL_DIR}/blimp_agent.py</string>
        <string>--server</string>
        <string>--port</string>
        <string>${AGENT_PORT}</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/agent.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/agent.err</string>

    <key>ThrottleInterval</key>
    <integer>30</integer>
</dict>
</plist>
EOF
chmod 644 "$PLIST_PATH"
success "LaunchDaemon plist written"

# Load the daemon
info "Starting Blimp Agent service..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load -w "$PLIST_PATH"
sleep 2

# Verify
if curl -sf "http://localhost:${AGENT_PORT}/health" | grep -q '"status":"ok"'; then
    success "Agent is running at http://localhost:${AGENT_PORT}"
else
    warn "Agent may still be starting. Check logs: tail -f ${LOG_DIR}/agent.err"
fi

echo ""
echo "  Installation complete!"
echo ""
echo "  API endpoints:"
echo "    http://localhost:${AGENT_PORT}/health  — health check"
echo "    http://localhost:${AGENT_PORT}/report  — full hardware inventory"
echo ""
echo "  Logs:    ${LOG_DIR}/"
echo "  Config:  ${INSTALL_DIR}/"
echo ""
echo "  To stop:    sudo launchctl unload ${PLIST_PATH}"
echo "  To uninstall: sudo bash uninstall-macos.sh"
echo ""
