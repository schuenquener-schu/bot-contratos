FROM ghcr.io/puppeteer/puppeteer:21.5.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./

# Instalação padrão, rápida e segura
USER root
RUN npm install
RUN chown -R pptruser:pptruser /usr/src/app
USER pptruser

COPY --chown=pptruser:pptruser . .

# Render detecta a porta automaticamente, mas 3000 é um bom padrão
EXPOSE 3000

CMD ["node", "index.js"]
