import React, { useState } from 'react';
import './App.css';

function App() {
  const [asciiArt, setAsciiArt] = useState('');
  const [animal, setAnimal] = useState('');
  const [finalGuess, setFinalGuess] = useState('');
  const [timeTaken, setTimeTaken] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState('idle');
  const [error, setError] = useState('');

  const GENERATOR_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1.5';
  const GUESSER_MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1.5';

  const animals = ['cat', 'owl', 'rabbit'];

  const callNvidiaAPI = async (model, messages) => {
    try {
      console.log('Calling API with model:', model);
      const response = await fetch('http://localhost:3001/api/nvidia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const rawText = await response.text();
      console.log('Raw API response:', rawText);

      let content;
      try {
        const data = JSON.parse(rawText);
        content =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.text ||
          data.output_text ||
          data.message?.content;
      } catch (err) {
        content = rawText;
      }

      if (!content) throw new Error('No content returned from API');
      return content.trim();
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  };

  const startCompetition = async () => {
    setIsRunning(true);
    setStage('generating');
    setFinalGuess('');
    setTimeTaken(0);
    setError('');
    setAsciiArt('');

    try {
      const selectedAnimal = animals[Math.floor(Math.random() * animals.length)];
      setAnimal(selectedAnimal);

      const artPrompt = `
        You are an expert ASCII artist.
        Generate a simple, minimal ASCII art of a ${selectedAnimal}.
        Output ONLY ASCII art, nothing else.
        Do NOT include explanations, reasoning, <think> tags, markdown, or extra text.
        If the animal is one of these, use exactly this ASCII:

        cat: (next 3 lines below represent a cat)
           /\_/\
          ( o.o )
          > ^ <

        owl: (next 2 lines below represent an owl)
          ( o.o )
          ( / \\ )

        rabbit:   (next 3 lines below represent a rabbit)
          (\__/)
          ( . .)
          (> <)

        Keep the art clear and recognizable. 
        Output ONLY the ASCII art.

        `;

      // Generate ASCII art
      let art = await callNvidiaAPI(GENERATOR_MODEL, [{ role: 'user', content: artPrompt }]);

      // Clean up response
      art = art.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (art.includes('```')) {
        const match = art.match(/```[\s\S]*?\n([\s\S]*?)```/);
        if (match && match[1]) art = match[1].trim();
      }

      setAsciiArt(art);

      setStage('guessing');
      const startTime = Date.now();

      const guessPrompt = `
      Look at this ASCII ${art} and identify what animal it is. 
      Reply with ONLY the animal name (one word, no punctuation) that you think it is:
      it could be a dog, cat, or an owl\n\n${art}`;

      let guess = await callNvidiaAPI(GUESSER_MODEL, [{ role: 'user', content: guessPrompt }]);
      const endTime = Date.now();

      // Clean up guess
      guess = guess.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      guess = guess.replace(/[^a-zA-Z]/g, '').toLowerCase();

      const timeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
      setTimeTaken(timeInSeconds);
      setFinalGuess(guess);

      setStage('complete');
    } catch (error) {
      console.error('Competition error:', error);
      setError(error.message);
      setStage('idle');
    }

    setIsRunning(false);
  };

  const isCorrect = finalGuess && animal && (finalGuess.includes(animal) || animal.includes(finalGuess));

  return (
    <div style={{ minHeight: '100vh', background: 'black', padding: '2rem', color: 'white' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            NVIDIA Nemotron AI Competition
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.125rem' }}>Two AI models compete: One creates, one guesses</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid white', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>ASCII Art Generator</h3>
            <p style={{ color: '#d1d5db', fontFamily: 'monospace', fontSize: '0.875rem' }}>{GENERATOR_MODEL}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid white', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI Guesser</h3>
            <p style={{ color: '#d1d5db', fontFamily: 'monospace', fontSize: '0.875rem' }}>{GUESSER_MODEL}</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={startCompetition}
            disabled={isRunning}
            style={{
              background: 'white',
              color: 'black',
              fontWeight: 'bold',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              fontSize: '1.25rem',
              border: 'none',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1
            }}
          >
            {isRunning ? '⏳ Competition Running...' : '▶ Start Competition'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '2rem', background: 'rgba(153,27,27,0.3)', border: '2px solid #ef4444', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#fca5a5' }}>Error: {error}</p>
          </div>
        )}

        {stage !== 'idle' && !error && (
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '2px solid white', borderRadius: '0.5rem', padding: '0.75rem 1.5rem' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {stage === 'generating' && '🎨 Generating ASCII art...'}
                {stage === 'guessing' && '🤔 AI is analyzing the art...'}
                {stage === 'complete' && '✅ Competition Complete!'}
              </p>
            </div>
          </div>
        )}

        {asciiArt && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid white', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Generated ASCII Art</h3>
              <div style={{ background: 'black', border: '2px solid white', borderRadius: '0.25rem', padding: '1rem', overflowX: 'auto' }}>
                <pre style={{ fontFamily: 'monospace', fontSize: '0.875rem', margin: 0 }}>{asciiArt}</pre>
              </div>
              {stage === 'complete' && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <p style={{ color: '#d1d5db', fontSize: '1.125rem' }}>
                    <span style={{ fontWeight: 'bold' }}>Actual Animal:</span> {animal}
                  </p>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid white', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>AI Guess Results</h3>
              {stage === 'complete' ? (
                <>
                  <div style={{ background: 'black', border: '2px solid white', borderRadius: '0.25rem', padding: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Time to Guess</p>
                      <p style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>{timeTaken}s</p>
                    </div>
                    <div style={{ borderTop: '2px solid white', paddingTop: '1rem' }}>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>AI's Guess:</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{finalGuess}</p>
                    </div>
                  </div>
                  <div style={{ 
                    borderRadius: '0.5rem', 
                    border: '2px solid white', 
                    padding: '1rem', 
                    textAlign: 'center',
                    background: isCorrect ? 'rgba(0,255,0,0.2)' : 'rgba(75,85,99,1)'
                  }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isCorrect ? 'white' : '#9ca3af' }}>
                      {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ background: 'black', border: '2px solid white', borderRadius: '0.25rem', padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '1.125rem' }}>Waiting for results...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
