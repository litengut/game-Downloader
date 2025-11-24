sudo docker run -d \
-e PUID=3000 \
-e PGID=3000 \
-e GAMES_DIR=/mnt/games \
--mount type=bind,src=/mnt/junk/games/download,dst=/mnt/games \
game-downloader