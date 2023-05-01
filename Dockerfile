
# build stage
FROM node:latest as frontend
WORKDIR /app

RUN git init
RUN git remote add origin https://github.com/AkiraPinemoon/quickshare-frontend.git

RUN wget https://raw.githubusercontent.com/AkiraPinemoon/quickshare-frontend/master/package.json
RUN wget https://raw.githubusercontent.com/AkiraPinemoon/quickshare-frontend/master/package-lock.json
RUN npm install

RUN git fetch     
RUN git checkout -t origin/master -f
# RUN git clone https://github.com/AkiraPinemoon/quickshare-frontend.git .
RUN npm run build

# production stage
FROM node:latest as backend
WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY --from=frontend /app/dist /app/dist

COPY . .
EXPOSE 80
CMD ["node", "index.js"]
