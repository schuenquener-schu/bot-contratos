FROM ghcr.io/puppeteer/puppeteer:21.5.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./

# Instalação limpa das dependências
USER root
RUN npm install
# Garante permissões corretas
RUN chown -R pptruser:pptruser /usr/src/app
USER pptruser

COPY --chown=pptruser:pptruser . .

# Importante: O Render define a porta automaticamente na variável PORT
# mas expomos a 3000 como padrão
EXPOSE 3000

CMD ["node", "index.js"]
