FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

# Apply existing migrations non-interactively, run seed (configured in package.json), then start dev server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed || true && npm run dev"]