#!/usr/bin/env bash
# Public IPv4 from `tofu -chdir=infra output -raw ip`.
: "${VM_HOST:?set VM_HOST to the VM public IPv4}"
: "${SSH_USER:=ubuntu}"
: "${SSH_KEY:=}"
export VM_HOST SSH_USER SSH_KEY

# Flags before the remote command are ssh options. The remaining arguments are the command.
ssh_vm() {
	local -a opts=(-o StrictHostKeyChecking=accept-new)
	local -a cmd=()
	if [ -n "${SSH_KEY}" ]; then
		opts+=(-i "$SSH_KEY")
	fi
	while [ $# -gt 0 ]; do
		case "$1" in
			--)
				shift
				cmd+=("$@")
				break
				;;
			-i|-L|-p|-o)
				opts+=("$1" "$2")
				shift 2
				;;
			-t|-T|-n|-v)
				opts+=("$1")
				shift
				;;
			*)
				cmd+=("$1")
				shift
				;;
		esac
	done
	ssh "${opts[@]}" "$SSH_USER@$VM_HOST" "${cmd[@]}"
}
