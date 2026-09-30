#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/oci.sh"
ssh_vm "$@"
