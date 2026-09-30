#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/oci.sh"
cd "$(dirname "$0")/.."

COMPOSE="cd /opt/tomo/src/infra && sudo docker compose --profile tools run --rm"

case "${1:-}" in
	studio)
		echo "→ open https://local.drizzle.studio (ctrl+c to stop)"
		ssh_vm -t -L 4983:127.0.0.1:4983 "$COMPOSE --service-ports tools"
		;;
	migrate)
		ssh_vm -t "$COMPOSE tools pnpm exec drizzle-kit migrate"
		;;
	*)
		echo "usage: $0 studio|migrate"
		exit 1
		;;
esac
