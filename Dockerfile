FROM node:10

ENV PORT 80
ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json
RUN cd /app && npm install

WORKDIR /app
ADD ./ /app

RUN npm run build

EXPOSE 80
CMD ["node", "."]
