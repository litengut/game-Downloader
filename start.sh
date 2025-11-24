sudo docker run -d \
# -e PUID=1000 \
# -e PGID=1000 \
-e GAMES_DIR=/mnt/games \
--mount type=bind,src=/mnt/junk/games/download,dst=/mnt/games \
game-downloader