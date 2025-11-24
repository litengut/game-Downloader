sudo docker run -d \
-u $(id -u):$(id -g) \
-e PUID=3000 \
-e PGID=3000 \
-e FIX_PERMISSIONS=true \
-e GAMES_DIR=/mnt/games \
--mount type=bind,src=/mnt/junk/games/download,dst=/mnt/games \
game-downloader