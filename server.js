const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // optional if Node < 18
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.NVIDIA_API_KEY;


app.post('/api/nvidia', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;
    console.log('Request to NVIDIA API:', { model });

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API Error:', errorText);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
