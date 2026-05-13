# =============================================================================
# LEGALFLOW CLIENT PORTAL - DOCKERFILE PRODUCCION
# =============================================================================
# Multi-stage build para optimizar el tamano de la imagen
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el codigo fuente
COPY . .

# Variables de entorno para el build
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Build de produccion
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copiar configuracion de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos build
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
