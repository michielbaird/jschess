FROM node:alpine
ADD data_model.js /app/
ADD index.js /app/
ADD package.json /app/
ADD public /app/public
CWD /app
RUN npm install
CMD node index.js

