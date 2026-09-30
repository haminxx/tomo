# Builds for the host architecture. The Always Free VM is linux/arm64.
# node:22-bookworm publishes arm64. The Playwright noble image does not, so it is not the base.
FROM node:22-bookworm

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-pip python3-venv git curl jq ripgrep ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# @openai/codex@0.157.1 publishes linux-arm64, so the CLI stays pinned on the Ampere VM.
# @openai/codex-sdk@0.159.2 is the latest 0.x; it nests its own CLI and does not replace this one.
# @excalidraw/excalidraw@0.18.1 is the current release.
RUN npm install -g pnpm @openai/codex@0.157.1 @openai/codex-sdk@0.159.2 @excalidraw/excalidraw@0.18.1 \
	&& npm cache clean --force

COPY codex.toml /opt/codex/config.toml
RUN chown -R 1000:1000 /opt/codex

ENV NODE_PATH=/usr/local/lib/node_modules \
	PIP_BREAK_SYSTEM_PACKAGES=1 \
	HOME=/workspace \
	CODEX_HOME=/opt/codex

WORKDIR /workspace
USER 1000:1000
CMD ["sleep", "infinity"]
