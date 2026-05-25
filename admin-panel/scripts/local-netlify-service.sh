#!/usr/bin/env bash
set -euo pipefail

SERVICE_ID="com.rooh.admin-netlify"
PLIST_PATH="$HOME/Library/LaunchAgents/$SERVICE_ID.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ADMIN_DIR/.local-logs"
LOG_FILE="$LOG_DIR/netlify-dev.log"

usage() {
  echo "Usage: pnpm run local-service:{install|start|stop|restart|status|uninstall}"
}

write_plist() {
  mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
  cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$SERVICE_ID</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "$ADMIN_DIR" &amp;&amp; pnpm run dev:netlify</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>
  <key>WorkingDirectory</key>
  <string>/</string>
</dict>
</plist>
PLIST
}

service_status() {
  launchctl print "gui/$(id -u)/$SERVICE_ID" >/dev/null 2>&1 && {
    echo "$SERVICE_ID is running"
    echo "URL: http://localhost:8888"
    echo "Log: $LOG_FILE"
    return 0
  }
  echo "$SERVICE_ID is not running"
  return 1
}

unload_service() {
  launchctl bootout "gui/$(id -u)/$SERVICE_ID" 2>/dev/null || true
  launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
}

case "${1:-}" in
  install)
    write_plist
    launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
    launchctl kickstart -k "gui/$(id -u)/$SERVICE_ID" 2>/dev/null || true
    service_status || true
    ;;
  start)
    write_plist
    launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
    launchctl kickstart -k "gui/$(id -u)/$SERVICE_ID" 2>/dev/null || true
    service_status || true
    ;;
  stop)
    unload_service
    service_status || true
    ;;
  restart)
    unload_service
    sleep 1
    "$0" start
    ;;
  status)
    service_status || true
    ;;
  uninstall)
    unload_service
    rm -f "$PLIST_PATH"
    echo "Removed $SERVICE_ID"
    ;;
  *)
    usage
    exit 1
    ;;
esac
