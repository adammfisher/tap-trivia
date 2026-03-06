# Asset Generation

Run these commands to generate required assets:

## Silent video (screensaver prevention)
```bash
brew install ffmpeg
ffmpeg -y -f lavfi -i "color=c=black:s=1x1:d=1" -f lavfi -i "anullsrc=r=44100:cl=mono" -t 1 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest images/silent.mp4
```
