# create image from nodejs base image
FROM node:8.1

# clone repo from github
RUN git clone https://github.com/dchowitz/learnnode-walkthrough.git

# change working dir to the clone directory
WORKDIR /learnnode-walkthrough

# install all the dependencies
RUN npm install --production

# expose port
EXPOSE 3001

# run the app
CMD ["npm", "run", "prod"]
