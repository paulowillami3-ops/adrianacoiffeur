FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /usr/src/app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
# Usar --unsafe-perm para evitar erros de permissão com npm em root
# O Puppeteer já está na imagem, mas precisamos do whatsapp-web.js
RUN npm install --unsafe-perm

# Copiar o restante do código
COPY . .

# Comando para iniciar o bot
CMD [ "node", "whatsapp-bot.js" ]
