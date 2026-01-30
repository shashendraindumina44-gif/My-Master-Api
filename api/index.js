const express = require('express');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const cheerio = require('cheerio');
const app = express();

// 1. YouTube Search & Info (Thumbnail එක්කම)
app.get('/api/yt', async (req, res) => {
    const { query, type, url, itag } = req.query;
    try {
        if (type === 'search') {
            const r = await yts(query);
            const results = r.videos.slice(0, 10).map(v => ({
                title: v.title,
                thumbnail: v.thumbnail,
                url: v.url,
                duration: v.timestamp,
                views: v.views
            }));
            res.json(results);
        } else if (type === 'info') {
            const info = await ytdl.getInfo(url);
            const formats = info.formats.filter(f => f.hasVideo && f.hasAudio).map(f => ({
                itag: f.itag, quality: f.qualityLabel, size: Math.round(f.contentLength / 1024 / 1024) + 'MB'
            }));
            res.json({ title: info.videoDetails.title, formats });
        } else {
            res.setHeader('Content-Type', 'video/mp4');
            ytdl(url, { quality: itag }).pipe(res);
        }
    } catch (e) { res.status(500).send(e.message); }
});

// 2. TikTok (No Watermark)
app.get('/api/tt', async (req, res) => {
    const { url } = req.query;
    try {
        const response = await axios.get(`https://www.tikwm.com/api/?url=${url}`);
        const videoUrl = response.data.data.play;
        const stream = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });
        stream.data.pipe(res);
    } catch (e) { res.status(500).send(e.message); }
});

// 3. HappyMod (Mod APK Downloader)
app.get('/api/happymod', async (req, res) => {
    const { query } = req.query;
    try {
        const searchUrl = `https://www.happymod.com/search.html?q=${query}`;
        const { data } = await axios.get(searchUrl);
        const $ = cheerio.load(data);
        const results = [];
        $('.pdt-app-box').each((i, el) => {
            if (i < 5) {
                results.push({
                    name: $(el).find('h3').text().trim(),
                    link: "https://www.happymod.com" + $(el).find('a').attr('href'),
                    thumb: $(el).find('img').attr('data-original')
                });
            }
        });
        res.json(results);
    } catch (e) { res.status(500).send(e.message); }
});

module.exports = app;
