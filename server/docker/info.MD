# Docker Commands Cheat Sheet

## Images
```bash
# Build image
docker build -t image-name .
docker build -f path/to/Dockerfile -t image-name .

# List images
docker images

# Remove image
docker rmi image-name
docker rmi image-id

# Pull from registry
docker pull ubuntu:20.04
```

## Containers
```bash
# Run container
docker run image-name
docker run -d image-name                    # detached (background)
docker run -p 8080:80 image-name           # port mapping
docker run -v /host:/container image-name   # volume mount
docker run --name my-container image-name  # custom name
docker run -it image-name /bin/bash        # interactive terminal

# List containers
docker ps              # running only
docker ps -a           # all containers

# Start/stop containers
docker start container-id
docker stop container-id
docker restart container-id

# Remove containers
docker rm container-id
docker rm -f container-id  # force remove running container
```

## Logs & Debugging
```bash
# View logs
docker logs container-id
docker logs -f container-id    # follow logs
docker logs --tail 100 container-id

# Execute commands in running container
docker exec -it container-id /bin/bash
docker exec container-id ls -la

# Inspect container/image
docker inspect container-id
```

## Cleanup
```bash
# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything unused
docker system prune

# Remove everything (nuclear option)
docker system prune -a
```

## Useful Combinations
```bash
# Stop all running containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Follow logs for latest container
docker logs -f $(docker ps -lq)
```

## Common Patterns
```bash
# Build and run in one go
docker build -t my-app . && docker run -d -p 8080:8080 my-app

# Restart container with same settings
docker stop my-container && docker rm my-container && docker run -d --name my-container -p 8080:8080 my-app

# Quick debug running container
docker exec -it $(docker ps -lq) /bin/bash
```