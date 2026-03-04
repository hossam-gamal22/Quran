// server/story-renderer/index.ts
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import tmp from 'tmp';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
const app = express();
app.use(bodyParser.json({ limit: '2mb' }));
app.get('/health', (_, res) => res.json({ ok: true }));
app.post('/render-story', async (req, res) => {
  try {
    const { text = '', lang = 'ar', reciterAudioUrl, backgroundVideoUrl, duration = 10 } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const outPath = path.join(tmpDir.name, 'out.mp4');
    const bgPath = path.join(tmpDir.name, 'bg.mp4');
    const audioPath = path.join(tmpDir.name, 'audio.mp3');
    if (backgroundVideoUrl) {
      const bgResp = await fetch(backgroundVideoUrl);
      if (!bgResp.ok) throw new Error('Failed to download background video');
      const bgBuffer = await bgResp.arrayBuffer();
      fs.writeFileSync(bgPath, Buffer.from(bgBuffer));
    } else {
      const blank = path.join(tmpDir.name, 'blank.mp4');
      await new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=size=720x1280:duration=5:rate=25:color=0x111111', '-vf', "format=yuv420p", blank]);
        ff.on('exit', (code) => (code === 0 ? resolve(null) : reject(new Error('ffmpeg blank failed'))));
      });
      fs.renameSync(blank, bgPath);
    }
    if (reciterAudioUrl) {
      const aResp = await fetch(reciterAudioUrl);
      if (!aResp.ok) throw new Error('Failed to download reciter audio');
      const aBuffer = await aResp.arrayBuffer();
      fs.writeFileSync(audioPath, Buffer.from(aBuffer));
    } else {
      await new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(duration || 5), audioPath]);
        ff.on('exit', (code) => (code === 0 ? resolve(null) : reject(new Error('ffmpeg audio failed'))));
      });
    }
    const fontPath = path.join(__dirname, 'fonts', 'Amiri-Regular.ttf');
    await new Promise((resolve, reject) => {
      const args = ['-y','-i', bgPath,'-i', audioPath,'-vf', `drawtext=fontfile=${fontPath}:text='${escapeShell(text)}':fontcolor=white:fontsize=48:box=1:boxcolor=0x00000099:boxborderw=10:x=(w-text_w)/2:y=h-200`,'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-shortest', outPath];
      const ff = spawn('ffmpeg', args, { stdio: 'inherit' });
      ff.on('exit', (code) => (code === 0 ? resolve(null) : reject(new Error('ffmpeg failed with code ' + code))));
    });
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="story.mp4"');
    const readStream = fs.createReadStream(outPath);
    readStream.pipe(res);
    readStream.on('close', () => { try { tmpDir.removeCallback(); } catch {} });
  } catch (err) {
    console.error('render-story error', err);
    return res.status(500).json({ error: String(err) });
  }
});
function escapeShell(input: string) {
  // FFmpeg drawtext filter requires escaping backslash first, then special chars
  return input
    .replace(/\\/g, '\\\\')  // backslash must be first
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%');
}
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Story renderer listening on', port));
export default app;
