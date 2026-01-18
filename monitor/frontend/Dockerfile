FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# VITE_API_URL should be passed as a build arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]