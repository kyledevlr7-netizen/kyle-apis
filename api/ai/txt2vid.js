const axios = require('axios');

const meta = {
  name: 'Text To Video',
  desc: 'Generate a video URL from a text prompt using soli.aritek.app txt2videov3 endpoint',
  method: 'get',
  category: 'AI',
  guide: {
    prompt: 'The text prompt describing the video you want to generate',
  },
  params: ['prompt'],
};

async function txt2video(prompt) {
  const authToken =
    'eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT';
  try {
    const { data: k } = await axios.post(
      'https://soli.aritek.app/txt2videov3',
      {
        deviceID:
          Math.random().toString(16).substr(2, 8) +
          Math.random().toString(16).substr(2, 8),
        prompt: prompt,
        used: [],
        versionCode: 51,
      },
      {
        headers: {
          authorization: authToken,
          'content-type': 'application/json; charset=utf-8',
          'accept-encoding': 'gzip',
          'user-agent': 'okhttp/4.11.0',
        },
        timeout: 120000,
      }
    );

    const key = k?.key;
    if (!key) throw new Error('Key not returned from txt2videov3');

    const { data } = await axios.post(
      'https://soli.aritek.app/video',
      { keys: [key] },
      {
        headers: {
          authorization: authToken,
          'content-type': 'application/json; charset=utf-8',
          'accept-encoding': 'gzip',
          'user-agent': 'okhttp/4.11.0',
        },
        timeout: 120000,
      }
    );

    const url = data?.datas?.[0]?.url || null;
    if (!url) throw new Error('Video URL not returned');

    return url;
  } catch (error) {
    // normalize error message
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        String(error)
    );
  }
}

async function onStart({ req, res }) {
  const { prompt } = req.query;

  if (!prompt) {
    return res.status(400).json({
      error: 'Missing required parameter: prompt',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const url = await txt2video(prompt);

    return res.status(200).json({
      result: { url },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { meta, onStart };
