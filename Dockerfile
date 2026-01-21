FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root

# Instalar dependências adicionais se necessário, mas a imagem base já tem o Chrome
# Definir diretório de trabalho
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências do projeto
# --production para não instalar devDependencies
RUN npm install --omit=dev

# Copiar o resto do código
COPY . .

# Criar pasta de auth e cache com permissões corretas
RUN mkdir -p .wwebjs_auth .wwebjs_cache
RUN chown -R messagebus:messagebus /usr/src/app

# Mudar para usuário não-root (recomendado para Puppeteer)
USER messagebus

# Variáveis de ambiente para o Puppeteer funcionar no Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Comando para iniciar o bot
CMD [ "node", "index.js" ]
