# Story Renderer
POST /render-story with JSON { text, lang, reciterAudioUrl?, backgroundVideoUrl?, duration? } streams back an MP4.
Build & run locally:
docker build -t story-renderer server/story-renderer
docker run --env PEXELS_API_KEY=$PEXELS_API_KEY -p 3001:3000 story-renderer
