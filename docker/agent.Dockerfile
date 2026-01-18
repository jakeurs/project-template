# Base image with Python 3.11 (needed for MCP tools and Ask_Gemini)
FROM python:3.11-slim

# Install system dependencies, Node.js (for Opencode/npm tools), and Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    gnupg \
    && mkdir -m 0755 -p /etc/apt/keyrings \
    # Install Node.js 20.x
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    # Add Docker's official GPG key
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    # Install Node.js and Docker CLI
    && apt-get update && apt-get install -y nodejs docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install the Python Docker SDK and Gemini SDK for custom tools
RUN pip install --no-cache-dir docker google-genai requests

# Install Opencode, Oh-My-Opencode, and standard MCP servers globally
# Note: Adjust ' @geminicli/opencode' to the exact npm package name if different
RUN npm install -g opencode-ai oh-my-opencode \
    @modelcontextprotocol/server-filesystem \
    @modelcontextprotocol/server-sequential-thinking \
    @upstash/context7-mcp

# Set working directory to the mounted workspace
WORKDIR /workspace

CMD ["/bin/bash"]