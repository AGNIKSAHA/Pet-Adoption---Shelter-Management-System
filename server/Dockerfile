# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
# If you have public or other folders that need to be copied, add them here
# COPY --from=builder /app/src/app/templates ./src/app/templates

EXPOSE 5000

CMD ["npm", "start"]
