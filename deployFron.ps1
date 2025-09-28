# ====== Config ======
$AccountId    = "293578647275"
$Region       = "us-east-2"
$Registry     = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$Cluster      = "iaapp-ecs-cluster"
$FrontendSvc  = "iaapp-frontend-svc"

# Pon la IP pública del backend (ya corriendo en :3000 con /api/gpt)
$BackendIP    = "3.142.164.172"
$ViteApiBase  = "http://$BackendIP:3000/api/gpt"

# Ruta del frontend
$FrontendPath = ".\react-assistance"

# (Opcional) Si usas un perfil de AWS:
# $AwsExtra = "--profile TU_PERFIL"
$AwsExtra = ""

Write-Host "Login en ECR..." -ForegroundColor Cyan
$TOKEN = aws ecr get-login-password --region $Region $AwsExtra
$TOKEN | docker login --username AWS --password-stdin $Registry

Write-Host "Verificando repo ECR iaapp-frontend..." -ForegroundColor Cyan
try {
  # Fuerza que lance excepción si falla
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Stop'
  aws ecr describe-repositories --region $Region --repository-names iaapp-frontend $AwsExtra | Out-Null
}
catch {
  Write-Host "No existe, creando repo iaapp-frontend..." -ForegroundColor Yellow
  aws ecr create-repository `
    --repository-name iaapp-frontend `
    --image-scanning-configuration scanOnPush=true `
    --region $Region $AwsExtra | Out-Null
}
finally {
  $ErrorActionPreference = $old
}

Write-Host "Construyendo imagen frontend con VITE_API_BASE=$ViteApiBase ..." -ForegroundColor Cyan
docker build `
  --build-arg VITE_API_BASE=$ViteApiBase `
  -t iaapp-frontend:latest `
  $FrontendPath

Write-Host "Etiquetando y enviando a ECR..." -ForegroundColor Cyan
docker tag iaapp-frontend:latest "$Registry/iaapp-frontend:latest"
docker push "$Registry/iaapp-frontend:latest"

Write-Host "Forzando nuevo deployment en ECS..." -ForegroundColor Cyan
aws ecs update-service `
  --cluster $Cluster `
  --service $FrontendSvc `
  --force-new-deployment `
  --region $Region $AwsExtra | Out-Null

Write-Host "Verificando eventos del servicio..." -ForegroundColor Cyan
aws ecs describe-services `
  --cluster $Cluster `
  --services $FrontendSvc `
  --region $Region $AwsExtra `
  --query 'services[0].events[0:6].[createdAt,message]' `
  --output table

Write-Host "Listando tareas RUNNING..." -ForegroundColor Cyan
aws ecs list-tasks `
  --cluster $Cluster `
  --service-name $FrontendSvc `
  --desired-status RUNNING `
  --region $Region $AwsExtra
