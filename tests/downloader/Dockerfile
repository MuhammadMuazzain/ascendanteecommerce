# Dockerfile para simular entorno de Vercel/Serverless para yt-dlp + ffmpeg
FROM node:20-slim

# Instalamos dependencias básicas + ffmpeg
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalamos pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copiamos solo los archivos necesarios para instalar dependencias primero
COPY package.json pnpm-lock.yaml* ./

# Instalamos dependencias de Node
RUN pnpm install

# Copiamos el resto del código
COPY . .

# Comando para ejecutar el test de yt-dlp usando tsx
CMD ["npx", "tsx", "tests/downloader/test.ts"]
