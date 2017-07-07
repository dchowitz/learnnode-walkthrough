#!/bin/bash

set -e

dockerHost=$1
echo "going to deploy to $dockerHost"

dockerEnv="$(docker-machine env $dockerHost)"
eval $dockerEnv

name=${PWD##*/}
image=$name:dev
container=$name

if docker container ls -a | grep $container; then
  echo "found container $container"
  docker stop $container
  docker rm $container
else
  echo "no container $container"
fi

if docker images --format "{{.Repository}}:{{.Tag}}" | grep $image; then
  echo "found image $image"
  docker rmi $image
else
  echo "no image $image"
fi

docker build -t $image .
docker run -d -p 3001:7777 --env-file dev.env --name $container $image
docker ps

# unset docker host
eval $(docker-machine env -u)