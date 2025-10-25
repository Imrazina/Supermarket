echo "info creating docker network with configuration {driver: bridge, label: chat-network, name: chat-network}"

docker network create \
--driver bridge \
--label chat-network \
chat-network
