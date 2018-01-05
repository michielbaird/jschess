FROM node:alpine
ADD datamodel.js /app/
ADD index.js /app/
ADD package.json /app/
ADD public /app/public
WORKDIR /app
RUN npm install
CMD node index.js

