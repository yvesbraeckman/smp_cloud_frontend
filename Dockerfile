# Gebruik een lichte versie van Node.js
FROM node:20-alpine

# Stel de werkmap in de container in
WORKDIR /app

# Kopieer de package bestanden
COPY package*.json ./

# Installeer Angular CLI globaal en installeer de project packages
RUN npm install -g @angular/cli
RUN npm install

# Start de Angular development server
# --host 0.0.0.0 zorgt dat hij van buiten de container bereikbaar is
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]