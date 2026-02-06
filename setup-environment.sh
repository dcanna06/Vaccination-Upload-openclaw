#!/bin/bash
# ============================================================================
# AIR Bulk Vaccination Upload - WSL2 Environment Setup Script
# ============================================================================
# This script checks for and installs all required development dependencies.
# Run with: chmod +x setup-environment.sh && ./setup-environment.sh
# ============================================================================

set -e

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

ERRORS=()
WARNINGS=()
INSTALLED=()

print_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_ok() {
    echo -e "  ${GREEN}✓${NC} $1"
    INSTALLED+=("$1")
}

print_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    WARNINGS+=("$1")
}

print_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ERRORS+=("$1")
}

print_installing() {
    echo -e "  ${YELLOW}→ Installing $1...${NC}"
}

# ============================================================================
print_header "AIR Project - Environment Setup for WSL2"
# ============================================================================

echo "This script will check and install the following:"
echo "  1. System packages (curl, build-essential, etc.)"
echo "  2. Node.js 20+ (via nvm)"
echo "  3. Python 3.12+ (via deadsnakes PPA)"
echo "  4. PostgreSQL 16 (via Docker)"
echo "  5. Redis (via Docker)"
echo "  6. Docker & Docker Compose"
echo "  7. Git configuration"
echo "  8. Claude Code CLI"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# ============================================================================
print_header "1. System Packages"
# ============================================================================

print_step "Updating apt package lists..."
sudo apt-get update -qq

SYSTEM_PACKAGES=(curl wget gnupg2 lsb-release ca-certificates software-properties-common build-essential libssl-dev libffi-dev)

for pkg in "${SYSTEM_PACKAGES[@]}"; do
    if dpkg -s "$pkg" &>/dev/null; then
        print_ok "$pkg already installed"
    else
        print_installing "$pkg"
        sudo apt-get install -y -qq "$pkg"
        print_ok "$pkg installed"
    fi
done

# ============================================================================
print_header "2. Node.js 20+ (via nvm)"
# ============================================================================

print_step "Checking for nvm..."

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if command -v nvm &>/dev/null; then
    print_ok "nvm is installed"
else
    print_installing "nvm"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    print_ok "nvm installed"
fi

print_step "Checking Node.js version..."

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 20 ]; then
        print_ok "Node.js v$NODE_VERSION (meets >=20 requirement)"
    else
        print_warn "Node.js v$NODE_VERSION found but need >=20. Installing Node.js 20..."
        nvm install 20
        nvm use 20
        nvm alias default 20
        print_ok "Node.js $(node --version) installed and set as default"
    fi
else
    print_installing "Node.js 20 LTS"
    nvm install 20
    nvm use 20
    nvm alias default 20
    print_ok "Node.js $(node --version) installed and set as default"
fi

print_step "Checking npm..."
if command -v npm &>/dev/null; then
    print_ok "npm $(npm --version)"
else
    print_fail "npm not found — should have been installed with Node.js"
fi

# ============================================================================
print_header "3. Python 3.12+"
# ============================================================================

print_step "Checking Python version..."

PYTHON_CMD=""

# Check python3.12 first, then python3
for cmd in python3.12 python3; do
    if command -v "$cmd" &>/dev/null; then
        PY_VERSION=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+')
        PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
        PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
        if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 12 ]; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [ -n "$PYTHON_CMD" ]; then
    print_ok "Python $($PYTHON_CMD --version 2>&1) (meets >=3.12 requirement)"
else
    print_installing "Python 3.12 via deadsnakes PPA"
    sudo add-apt-repository -y ppa:deadsnakes/ppa
    sudo apt-get update -qq
    sudo apt-get install -y -qq python3.12 python3.12-venv python3.12-dev
    PYTHON_CMD="python3.12"
    print_ok "Python $($PYTHON_CMD --version 2>&1) installed"
fi

print_step "Checking pip..."
if $PYTHON_CMD -m pip --version &>/dev/null; then
    print_ok "pip $($PYTHON_CMD -m pip --version | grep -oP '\d+\.\d+\.\d+')"
else
    print_installing "pip"
    curl -sS https://bootstrap.pypa.io/get-pip.py | $PYTHON_CMD
    print_ok "pip installed"
fi

print_step "Ensuring python3.12-venv is available..."
if $PYTHON_CMD -m venv --help &>/dev/null; then
    print_ok "python venv module available"
else
    print_installing "python3.12-venv"
    sudo apt-get install -y -qq python3.12-venv
    print_ok "python3.12-venv installed"
fi

# ============================================================================
print_header "4. Docker & Docker Compose"
# ============================================================================

print_step "Checking Docker..."

if command -v docker &>/dev/null; then
    print_ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"
else
    print_installing "Docker"
    # Remove old versions if any
    sudo apt-get remove -y -qq docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Add Docker GPG key and repo
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group (avoids needing sudo)
    sudo usermod -aG docker "$USER"
    print_ok "Docker installed"
    print_warn "You may need to restart your WSL2 session for Docker group membership to take effect"
fi

print_step "Checking Docker Compose..."
if docker compose version &>/dev/null; then
    print_ok "Docker Compose $(docker compose version | grep -oP '\d+\.\d+\.\d+')"
else
    print_fail "Docker Compose not found — should have been installed with Docker"
fi

print_step "Ensuring Docker daemon is running..."
if sudo service docker status &>/dev/null; then
    print_ok "Docker daemon is running"
else
    print_installing "Starting Docker daemon"
    sudo service docker start
    sleep 2
    if sudo service docker status &>/dev/null; then
        print_ok "Docker daemon started"
    else
        print_warn "Could not start Docker daemon. You may need to start it manually: sudo service docker start"
    fi
fi

# ============================================================================
print_header "5. PostgreSQL 16 (via Docker)"
# ============================================================================

print_step "Checking for PostgreSQL 16 Docker container..."

PG_CONTAINER="air-postgres"
PG_RUNNING=$(docker ps --filter "name=$PG_CONTAINER" --format "{{.Names}}" 2>/dev/null || echo "")
PG_EXISTS=$(docker ps -a --filter "name=$PG_CONTAINER" --format "{{.Names}}" 2>/dev/null || echo "")

if [ "$PG_RUNNING" = "$PG_CONTAINER" ]; then
    print_ok "PostgreSQL 16 container '$PG_CONTAINER' is running"
elif [ "$PG_EXISTS" = "$PG_CONTAINER" ]; then
    print_warn "PostgreSQL 16 container '$PG_CONTAINER' exists but is stopped. Starting..."
    docker start "$PG_CONTAINER"
    print_ok "PostgreSQL 16 container started"
else
    print_installing "PostgreSQL 16 Docker container"

    # Prompt for password
    read -sp "Enter a password for PostgreSQL (default: airdev123): " PG_PASSWORD
    echo ""
    PG_PASSWORD=${PG_PASSWORD:-airdev123}

    docker run -d \
        --name "$PG_CONTAINER" \
        -e POSTGRES_DB=air_vaccination \
        -e POSTGRES_USER=air_admin \
        -e POSTGRES_PASSWORD="$PG_PASSWORD" \
        -p 5432:5432 \
        --restart unless-stopped \
        postgres:16-alpine

    # Wait for PostgreSQL to be ready
    echo "  Waiting for PostgreSQL to start..."
    sleep 3
    for i in {1..10}; do
        if docker exec "$PG_CONTAINER" pg_isready -U air_admin &>/dev/null; then
            break
        fi
        sleep 1
    done

    if docker exec "$PG_CONTAINER" pg_isready -U air_admin &>/dev/null; then
        print_ok "PostgreSQL 16 running on localhost:5432 (db: air_vaccination, user: air_admin)"
    else
        print_fail "PostgreSQL container started but not responding yet. Check with: docker logs $PG_CONTAINER"
    fi
fi

# ============================================================================
print_header "6. Redis (via Docker)"
# ============================================================================

print_step "Checking for Redis Docker container..."

REDIS_CONTAINER="air-redis"
REDIS_RUNNING=$(docker ps --filter "name=$REDIS_CONTAINER" --format "{{.Names}}" 2>/dev/null || echo "")
REDIS_EXISTS=$(docker ps -a --filter "name=$REDIS_CONTAINER" --format "{{.Names}}" 2>/dev/null || echo "")

if [ "$REDIS_RUNNING" = "$REDIS_CONTAINER" ]; then
    print_ok "Redis container '$REDIS_CONTAINER' is running"
elif [ "$REDIS_EXISTS" = "$REDIS_CONTAINER" ]; then
    print_warn "Redis container '$REDIS_CONTAINER' exists but is stopped. Starting..."
    docker start "$REDIS_CONTAINER"
    print_ok "Redis container started"
else
    print_installing "Redis Docker container"
    docker run -d \
        --name "$REDIS_CONTAINER" \
        -p 6379:6379 \
        --restart unless-stopped \
        redis:7-alpine

    sleep 2

    if docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; then
        print_ok "Redis running on localhost:6379"
    else
        print_fail "Redis container started but not responding. Check with: docker logs $REDIS_CONTAINER"
    fi
fi

# ============================================================================
print_header "7. Git Configuration"
# ============================================================================

print_step "Checking Git..."
if command -v git &>/dev/null; then
    print_ok "Git $(git --version | grep -oP '\d+\.\d+\.\d+')"
else
    print_installing "Git"
    sudo apt-get install -y -qq git
    print_ok "Git installed"
fi

print_step "Checking Git user config..."
GIT_NAME=$(git config --global user.name 2>/dev/null || echo "")
GIT_EMAIL=$(git config --global user.email 2>/dev/null || echo "")

if [ -n "$GIT_NAME" ]; then
    print_ok "Git user.name = $GIT_NAME"
else
    read -p "  Enter your Git name (e.g., David Canna): " GIT_NAME
    git config --global user.name "$GIT_NAME"
    print_ok "Git user.name set to $GIT_NAME"
fi

if [ -n "$GIT_EMAIL" ]; then
    print_ok "Git user.email = $GIT_EMAIL"
else
    read -p "  Enter your Git email: " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
    print_ok "Git user.email set to $GIT_EMAIL"
fi

print_step "Checking GitHub SSH access..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    print_ok "GitHub SSH authentication working"
else
    print_warn "GitHub SSH not configured. You can either:"
    echo "         Option A: Set up SSH key:"
    echo "           ssh-keygen -t ed25519 -C \"$GIT_EMAIL\""
    echo "           cat ~/.ssh/id_ed25519.pub  # Add this to GitHub → Settings → SSH Keys"
    echo "         Option B: Use HTTPS with a Personal Access Token"
fi

# ============================================================================
print_header "8. Claude Code CLI"
# ============================================================================

print_step "Checking Claude Code CLI..."

if command -v claude &>/dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    print_ok "Claude Code CLI installed ($CLAUDE_VERSION)"
else
    print_installing "Claude Code CLI (@anthropic-ai/claude-code)"
    npm install -g @anthropic-ai/claude-code
    if command -v claude &>/dev/null; then
        print_ok "Claude Code CLI installed ($(claude --version 2>/dev/null || echo 'unknown'))"
    else
        print_fail "Claude Code CLI installation failed. Try manually: npm install -g @anthropic-ai/claude-code"
    fi
fi

# ============================================================================
print_header "9. Project Repository Check"
# ============================================================================

REPO_DIR="$HOME/Vaccination-Upload"

print_step "Checking for project repository..."
if [ -d "$REPO_DIR/.git" ]; then
    print_ok "Repository exists at $REPO_DIR"
    cd "$REPO_DIR"
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
    print_ok "Remote origin: $REMOTE"
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    print_ok "Current branch: $BRANCH"
else
    print_warn "Repository not found at $REPO_DIR"
    read -p "  Clone from https://github.com/dcanna06/Vaccination-Upload.git? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git clone https://github.com/dcanna06/Vaccination-Upload.git "$REPO_DIR"
        print_ok "Repository cloned to $REPO_DIR"
    fi
fi

# ============================================================================
print_header "10. Create .env.example for the Project"
# ============================================================================

if [ -d "$REPO_DIR" ]; then
    ENV_FILE="$REPO_DIR/.env.example"
    if [ ! -f "$ENV_FILE" ]; then
        print_step "Creating .env.example template..."
        cat > "$ENV_FILE" << 'ENVEOF'
# ============================================================================
# AIR Bulk Vaccination Upload - Environment Configuration
# ============================================================================
# Copy this file to .env and fill in your values:
#   cp .env.example .env
# ============================================================================

# --- Application ---
APP_ENV=development                # development | vendor-test | production
APP_PORT=8000
APP_SECRET_KEY=change-me-to-a-random-64-char-string
FRONTEND_URL=http://localhost:3000

# --- Database (PostgreSQL) ---
DATABASE_URL=postgresql+asyncpg://air_admin:airdev123@localhost:5432/air_vaccination

# --- Redis ---
REDIS_URL=redis://localhost:6379/0

# --- PRODA B2B Authentication ---
PRODA_ORG_ID=
PRODA_DEVICE_NAME=
PRODA_KEY_STORE_PATH=              # Path to JKS file
PRODA_KEY_STORE_PASSWORD=
PRODA_KEY_ALIAS=
PRODA_KEY_PASSWORD=

# --- AIR API ---
AIR_PRODUCT_ID=                    # Your registered dhs-productId
AIR_CLIENT_ID=                     # X-IBM-Client-Id from Services Australia
AIR_VENDOR_BASE_URL=https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd
AIR_PROD_BASE_URL=https://healthclaiming.api.humanservices.gov.au/claiming/ext

# --- Minor ID ---
# See: Correct_use_of_Minor_ID_v1_1.pdf
MINOR_ID_LOCATION_ID=
MINOR_ID_SOFTWARE_ID=
MINOR_ID_COUNTER_START=00001

# --- JWT Session ---
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_MAX_SESSION_HOURS=8

# --- Logging ---
LOG_LEVEL=INFO                     # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT=json                    # json | console
ENVEOF
        print_ok ".env.example created at $ENV_FILE"
    else
        print_ok ".env.example already exists"
    fi
fi

# ============================================================================
print_header "SUMMARY"
# ============================================================================

echo ""
echo -e "${GREEN}Successfully installed/verified (${#INSTALLED[@]} items):${NC}"
for item in "${INSTALLED[@]}"; do
    echo -e "  ${GREEN}✓${NC} $item"
done

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Warnings (${#WARNINGS[@]} items):${NC}"
    for item in "${WARNINGS[@]}"; do
        echo -e "  ${YELLOW}⚠${NC} $item"
    done
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Errors (${#ERRORS[@]} items):${NC}"
    for item in "${ERRORS[@]}"; do
        echo -e "  ${RED}✗${NC} $item"
    done
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}Environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. cd ~/Vaccination-Upload"
echo "  2. cp .env.example .env     # Edit with your actual credentials"
echo "  3. Start TICKET-001:        git checkout -b feature/TICKET-001-project-setup"
echo "  4. Launch Claude Code:      claude"
echo ""
echo "Docker containers running:"
echo "  PostgreSQL: localhost:5432  (db: air_vaccination, user: air_admin)"
echo "  Redis:      localhost:6379"
echo ""
echo "To stop containers:   docker stop air-postgres air-redis"
echo "To start containers:  docker start air-postgres air-redis"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
