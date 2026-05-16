# Dockerfile para simular entorno de Vercel/Serverless
FROM node:20-slim

# Instalamos las dependencias mínimas del sistema que Chromium necesita para correr en Linux.
# Vercel/Lambda ya tienen muchas de estas, pero para simularlo en Docker necesitamos instalarlas.
RUN apt-get update && apt-get install -y \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    fonts-liberation \
    libappindicator3-1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Instalamos pnpm (ya que el proyecto lo usa)
RUN npm install -g pnpm

WORKDIR /app

# Copiamos solo los archivos necesarios para instalar dependencias primero (cache optimization)
COPY package.json pnpm-lock.yaml* ./

# Instalamos dependencias
# Nota: usamos --frozen-lockfile si el lockfile existe
RUN pnpm install

# Copiamos el resto del código
COPY . .

# Exponemos una variable de entorno para que @sparticuz/chromium sepa que no está en Lambda real
# pero forzamos el modo headless.
ENV IS_LOCAL=true

# Comando para ejecutar el test usando tsx (que ya está en tus devDependencies)
CMD ["npx", "tsx", "tests/scraper/test.ts"]
