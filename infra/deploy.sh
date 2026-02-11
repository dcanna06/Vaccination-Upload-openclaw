#!/bin/bash
set -euo pipefail

###############################################################################
# AIR Bulk Vaccination Upload — Manual Deploy
#
# Builds Docker images, pushes to ACR, and restarts App Services.
# Use this for ad-hoc deployments outside GitHub Actions CI/CD.
#
# Prerequisites:
#   az login
#   az acr login --name airvaccinationacr
#
# Usage:
#   ./infra/deploy.sh              # Deploy both backend and frontend
#   ./infra/deploy.sh backend      # Deploy backend only
#   ./infra/deploy.sh frontend     # Deploy frontend only
###############################################################################

ACR_NAME="airvaccinationacr"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP="air-vaccination-rg"
BACKEND_APP="air-vaccination-backend"
FRONTEND_APP="air-vaccination-frontend"

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"
TARGET="${1:-all}"

echo "Deploy target: ${TARGET} | Image tag: ${TAG}"
echo ""

deploy_backend() {
  echo "▸ Building backend image..."
  docker build -t "${ACR_LOGIN_SERVER}/air-backend:${TAG}" \
               -t "${ACR_LOGIN_SERVER}/air-backend:latest" \
               ./backend

  echo "▸ Pushing backend image..."
  docker push "${ACR_LOGIN_SERVER}/air-backend:${TAG}"
  docker push "${ACR_LOGIN_SERVER}/air-backend:latest"

  echo "▸ Deploying backend App Service..."
  az webapp config container set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --container-image-name "${ACR_LOGIN_SERVER}/air-backend:${TAG}" \
    --output none

  az webapp restart \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --output none

  echo "  ✓ Backend deployed: https://${BACKEND_APP}.azurewebsites.net"
}

deploy_frontend() {
  echo "▸ Building frontend image..."
  docker build -t "${ACR_LOGIN_SERVER}/air-frontend:${TAG}" \
               -t "${ACR_LOGIN_SERVER}/air-frontend:latest" \
               ./frontend

  echo "▸ Pushing frontend image..."
  docker push "${ACR_LOGIN_SERVER}/air-frontend:${TAG}"
  docker push "${ACR_LOGIN_SERVER}/air-frontend:latest"

  echo "▸ Deploying frontend App Service..."
  az webapp config container set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --container-image-name "${ACR_LOGIN_SERVER}/air-frontend:${TAG}" \
    --output none

  az webapp restart \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --output none

  echo "  ✓ Frontend deployed: https://${FRONTEND_APP}.azurewebsites.net"
}

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  all)
    deploy_backend
    echo ""
    deploy_frontend
    ;;
  *)
    echo "Usage: $0 [backend|frontend|all]"
    exit 1
    ;;
esac

echo ""
echo "Deploy complete."
echo "  Run migrations: az webapp ssh --resource-group ${RESOURCE_GROUP} --name ${BACKEND_APP}"
echo "  Then: cd /app && alembic upgrade head"
