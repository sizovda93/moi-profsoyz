import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'txnCCHHGKmYIwrn7HfHQ';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!ELEVENLABS_API_KEY) {
      return Response.json({ error: 'ElevenLabs not configured' }, { status: 500 });
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('ElevenLabs error:', res.status, err);
      return Response.json({ error: 'TTS generation failed' }, { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('POST /api/avatar/tts error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
