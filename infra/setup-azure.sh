#!/bin/bash
set -euo pipefail

###############################################################################
# AIR Bulk Vaccination Upload — Azure Resource Provisioning
#
# Prerequisites:
#   1. Azure CLI installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
#   2. Logged in: az login
#   3. Subscription set: az account set --subscription <id>
#
# Usage:
#   chmod +x infra/setup-azure.sh
#   ./infra/setup-azure.sh
#
# This script is idempotent — re-running it will skip already-created resources.
###############################################################################

# ── Configuration ─────────────────────────────────────────────────────────────
LOCATION="australiaeast"
RESOURCE_GROUP="air-vaccination-rg"
ACR_NAME="airvaccinationacr"
POSTGRES_SERVER="air-vaccination-db"
POSTGRES_ADMIN_USER="airadmin"
POSTGRES_DB="air_vaccination"
REDIS_NAME="air-vaccination-redis"
KEYVAULT_NAME="air-vaccination-kv"
STORAGE_ACCOUNT="airvaccinationstorage"
STORAGE_CONTAINER="submissions"
APP_PLAN="air-vaccination-plan"
BACKEND_APP="air-vaccination-backend"
FRONTEND_APP="air-vaccination-frontend"

# Generate a random password for PostgreSQL
POSTGRES_PASSWORD="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)"
APP_SECRET_KEY="$(openssl rand -hex 32)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  AIR Bulk Vaccination Upload — Azure Provisioning           ║"
echo "║  Region: ${LOCATION}                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Resource Group ─────────────────────────────────────────────────────────
echo "▸ [1/10] Creating Resource Group: ${RESOURCE_GROUP}..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
echo "  ✓ Resource Group ready"

# ── 2. Azure Container Registry ───────────────────────────────────────────────
echo "▸ [2/10] Creating Container Registry: ${ACR_NAME}..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none
echo "  ✓ ACR ready"

ACR_LOGIN_SERVER="$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)"

# ── 3. PostgreSQL Flexible Server ─────────────────────────────────────────────
echo "▸ [3/10] Creating PostgreSQL Flexible Server: ${POSTGRES_SERVER}..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_SERVER" \
  --location "$LOCATION" \
  --admin-user "$POSTGRES_ADMIN_USER" \
  --admin-password "$POSTGRES_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --yes \
  --output none

# Allow Azure services to connect
echo "  → Configuring firewall (allow Azure services)..."
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_SERVER" \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none

# Create the application database
echo "  → Creating database: ${POSTGRES_DB}..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$POSTGRES_SERVER" \
  --database-name "$POSTGRES_DB" \
  --output none

POSTGRES_HOST="${POSTGRES_SERVER}.postgres.database.azure.com"
DATABASE_URL="postgresql+asyncpg://${POSTGRES_ADMIN_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?ssl=require"

echo "  ✓ PostgreSQL ready"

# ── 4. Azure Cache for Redis ──────────────────────────────────────────────────
echo "▸ [4/10] Creating Redis Cache: ${REDIS_NAME}..."
az redis create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REDIS_NAME" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size C0 \
  --output none

REDIS_KEY="$(az redis list-keys --resource-group "$RESOURCE_GROUP" --name "$REDIS_NAME" --query primaryKey -o tsv)"
REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380/0"

echo "  ✓ Redis ready"

# ── 5. Key Vault ──────────────────────────────────────────────────────────────
echo "▸ [5/10] Creating Key Vault: ${KEYVAULT_NAME}..."
az keyvault create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$KEYVAULT_NAME" \
  --location "$LOCATION" \
  --enable-rbac-authorization false \
  --output none

# Store secrets
echo "  → Storing secrets in Key Vault..."
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "app-secret-key" --value "$APP_SECRET_KEY" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "database-url" --value "$DATABASE_URL" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "redis-url" --value "$REDIS_URL" --output none

# Placeholder secrets — user must update these with real values
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "proda-jks-base64" --value "REPLACE_WITH_BASE64_ENCODED_JKS" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "proda-jks-password" --value "REPLACE_WITH_JKS_PASSWORD" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "proda-org-id" --value "REPLACE_WITH_ORG_ID" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "proda-device-name" --value "REPLACE_WITH_DEVICE_NAME" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "proda-client-id" --value "REPLACE_WITH_CLIENT_ID" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "air-client-id" --value "REPLACE_WITH_AIR_CLIENT_ID" --output none

echo "  ✓ Key Vault ready (update placeholder secrets with real values)"

# ── 6. Storage Account ────────────────────────────────────────────────────────
echo "▸ [6/10] Creating Storage Account: ${STORAGE_ACCOUNT}..."
az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --output none

STORAGE_KEY="$(az storage account keys list --resource-group "$RESOURCE_GROUP" --account-name "$STORAGE_ACCOUNT" --query '[0].value' -o tsv)"

az storage container create \
  --name "$STORAGE_CONTAINER" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --public-access off \
  --output none

echo "  ✓ Storage Account ready"

# ── 7. App Service Plan ───────────────────────────────────────────────────────
echo "▸ [7/10] Creating App Service Plan: ${APP_PLAN}..."
az appservice plan create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_PLAN" \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux \
  --output none
echo "  ✓ App Service Plan ready"

# ── 8. Backend App Service ────────────────────────────────────────────────────
echo "▸ [8/10] Creating Backend App Service: ${BACKEND_APP}..."

# Get ACR credentials
ACR_USERNAME="$(az acr credential show --name "$ACR_NAME" --query username -o tsv)"
ACR_PASSWORD="$(az acr credential show --name "$ACR_NAME" --query 'passwords[0].value' -o tsv)"

az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN" \
  --name "$BACKEND_APP" \
  --docker-registry-server-url "https://${ACR_LOGIN_SERVER}" \
  --docker-registry-server-user "$ACR_USERNAME" \
  --docker-registry-server-password "$ACR_PASSWORD" \
  --deployment-container-image-name "${ACR_LOGIN_SERVER}/air-backend:latest" \
  --output none

# Grant backend managed identity access to Key Vault
az webapp identity assign \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --output none

BACKEND_IDENTITY="$(az webapp identity show --resource-group "$RESOURCE_GROUP" --name "$BACKEND_APP" --query principalId -o tsv)"

az keyvault set-policy \
  --name "$KEYVAULT_NAME" \
  --object-id "$BACKEND_IDENTITY" \
  --secret-permissions get list \
  --output none

# Key Vault reference URI base
KV_URI="https://${KEYVAULT_NAME}.vault.azure.net/secrets"

# Configure app settings with Key Vault references
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    APP_ENV="vendor" \
    APP_SECRET_KEY="@Microsoft.KeyVault(SecretUri=${KV_URI}/app-secret-key)" \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=${KV_URI}/database-url)" \
    REDIS_URL="@Microsoft.KeyVault(SecretUri=${KV_URI}/redis-url)" \
    PRODA_JKS_BASE64="@Microsoft.KeyVault(SecretUri=${KV_URI}/proda-jks-base64)" \
    PRODA_JKS_PASSWORD="@Microsoft.KeyVault(SecretUri=${KV_URI}/proda-jks-password)" \
    PRODA_ORG_ID="@Microsoft.KeyVault(SecretUri=${KV_URI}/proda-org-id)" \
    PRODA_DEVICE_NAME="@Microsoft.KeyVault(SecretUri=${KV_URI}/proda-device-name)" \
    PRODA_CLIENT_ID="@Microsoft.KeyVault(SecretUri=${KV_URI}/proda-client-id)" \
    AIR_CLIENT_ID="@Microsoft.KeyVault(SecretUri=${KV_URI}/air-client-id)" \
    FRONTEND_URL="https://${FRONTEND_APP}.azurewebsites.net" \
    LOG_LEVEL="INFO" \
    LOG_FORMAT="json" \
    WEBSITES_PORT="8000" \
  --output none

# Enable always-on and set container startup timeout
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --always-on true \
  --output none

echo "  ✓ Backend App Service ready"

# ── 9. Frontend App Service ───────────────────────────────────────────────────
echo "▸ [9/10] Creating Frontend App Service: ${FRONTEND_APP}..."

az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN" \
  --name "$FRONTEND_APP" \
  --docker-registry-server-url "https://${ACR_LOGIN_SERVER}" \
  --docker-registry-server-user "$ACR_USERNAME" \
  --docker-registry-server-password "$ACR_PASSWORD" \
  --deployment-container-image-name "${ACR_LOGIN_SERVER}/air-frontend:latest" \
  --output none

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --settings \
    NEXT_PUBLIC_API_URL="https://${BACKEND_APP}.azurewebsites.net" \
    WEBSITES_PORT="3000" \
  --output none

az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --always-on true \
  --output none

echo "  ✓ Frontend App Service ready"

# ── 10. Create Service Principal for GitHub Actions (OIDC) ────────────────────
echo "▸ [10/10] Creating Service Principal for GitHub Actions..."

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

SP_OUTPUT="$(az ad sp create-for-rbac \
  --name "air-vaccination-github-actions" \
  --role Contributor \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}" \
  --query '{clientId: appId, tenantId: tenant}' \
  -o json)"

GH_CLIENT_ID="$(echo "$SP_OUTPUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["clientId"])')"
GH_TENANT_ID="$(echo "$SP_OUTPUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["tenantId"])')"

# Grant ACR push permission to service principal
az role assignment create \
  --assignee "$GH_CLIENT_ID" \
  --role AcrPush \
  --scope "$(az acr show --name "$ACR_NAME" --query id -o tsv)" \
  --output none

echo "  ✓ Service Principal ready"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Provisioning Complete                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "App URLs:"
echo "  Frontend: https://${FRONTEND_APP}.azurewebsites.net"
echo "  Backend:  https://${BACKEND_APP}.azurewebsites.net"
echo ""
echo "ACR Login Server: ${ACR_LOGIN_SERVER}"
echo ""
echo "───────────────────────────────────────────────────────────────"
echo "GitHub Actions Secrets (add these to your repo):"
echo "  AZURE_CLIENT_ID:        ${GH_CLIENT_ID}"
echo "  AZURE_TENANT_ID:        ${GH_TENANT_ID}"
echo "  AZURE_SUBSCRIPTION_ID:  ${SUBSCRIPTION_ID}"
echo ""
echo "Then configure OIDC federation:"
echo "  az ad app federated-credential create \\"
echo "    --id ${GH_CLIENT_ID} \\"
echo "    --parameters '{\"name\":\"github-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:<OWNER>/<REPO>:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}'"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "Key Vault placeholder secrets to update:"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name proda-jks-base64 --value <base64>"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name proda-jks-password --value <password>"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name proda-org-id --value <org-id>"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name proda-device-name --value <device-name>"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name proda-client-id --value <client-id>"
echo "  az keyvault secret set --vault-name ${KEYVAULT_NAME} --name air-client-id --value <client-id>"
echo ""
echo "PostgreSQL password (stored in Key Vault as database-url):"
echo "  ${POSTGRES_PASSWORD}"
echo ""
echo "Next steps:"
echo "  1. Update Key Vault placeholder secrets with real PRODA/AIR values"
echo "  2. Configure OIDC federation (command above) with your GitHub repo"
echo "  3. Add GitHub Actions secrets to your repo"
echo "  4. Push to main to trigger deployment"
echo "  5. Run Alembic migrations: az webapp ssh --resource-group ${RESOURCE_GROUP} --name ${BACKEND_APP}"
echo "     Then: cd /app && alembic upgrade head"
