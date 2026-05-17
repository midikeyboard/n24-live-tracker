const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const timingFeed = require('./timingFeed');

class ReplayPlayer {
  async start(filename) {
    if (!filename) {
      console.error('REPLAY_FILE environment variable not set.');
      return;
    }

    const filePath = path.join(__dirname, '..', '..', 'replays', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Replay file not found: ${filePath}`);
      return;
    }

    console.log(`Starting Replay Mode using file: ${filename}`);

    const fileStream = fs.createReadStream(filePath);
    let stream = fileStream;

    if (filename.endsWith('.gz')) {
      stream = fileStream.pipe(zlib.createGunzip());
    }

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let lastTimestamp = null;

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const payload = JSON.parse(line);
        const currentTimestamp = payload.timestamp;

        if (lastTimestamp) {
          const diffMs = currentTimestamp - lastTimestamp;
          // Apply a speed multiplier if desired? We do real-time, but cap max wait to 15s 
          // in case the recording had gaps/offline periods.
          let sleepMs = diffMs;
          if (sleepMs > 15000) sleepMs = 15000;
          if (sleepMs < 0) sleepMs = 0;
          
          if (sleepMs > 0) {
            await new Promise(resolve => setTimeout(resolve, sleepMs));
          }
        }

        lastTimestamp = currentTimestamp;

        if (payload.weather) {
          timingFeed.currentWeather = payload.weather;
        }

        if (payload.data) {
          timingFeed.processLivePayload(payload.data);
        }
      } catch (err) {
        console.error('Error parsing replay line:', err.message);
      }
    }

    console.log('Replay finished.');
  }
}

module.exports = new ReplayPlayer();
