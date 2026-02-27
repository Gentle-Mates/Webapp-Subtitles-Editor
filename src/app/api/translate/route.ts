import { auth } from '@/lib/auth';
import type { Subtitle, TranslationMode } from '@/utils/types';

const apiKey = process.env.MISTRAL_API_KEY;

const prompts: Record<TranslationMode, string> = {
    mix: `You are a professional subtitle translator. You will receive numbered subtitle lines from a video.

Your task:
1. Read ALL the subtitle lines to determine the OVERALL dominant language. Do not judge each line in isolation — use surrounding lines as context for ambiguous or short lines (slang, interjections, proper nouns).
2. Apply the translation rule:
   - If the dominant language is FRENCH → translate every line to ENGLISH
   - If the dominant language is ENGLISH → translate every line to FRENCH
   - If the dominant language is any other language → translate every line to FRENCH
3. EVERY line must be translated to the target language without exception. Never leave any line untranslated, even short interjections or proper nouns.

Return ONLY a JSON object: {"translations": ["translated line 1", "translated line 2", ...]}
Keep translations natural and concise, suitable for subtitles.`,

    fr: `You are a professional subtitle translator. You will receive numbered subtitle lines from a video.

Your task:
1. For each line, determine if it is already in FRENCH.
2. If a line is already in French, keep it exactly as-is.
3. If a line is NOT in French, translate it to FRENCH.
4. Use surrounding lines as context for ambiguous or short lines (slang, interjections, proper nouns).

Return ONLY a JSON object: {"translations": ["line 1", "line 2", ...]}
Keep translations natural and concise, suitable for subtitles.`,

    en: `You are a professional subtitle translator. You will receive numbered subtitle lines from a video.

Your task:
1. For each line, determine if it is already in ENGLISH.
2. If a line is already in English, keep it exactly as-is.
3. If a line is NOT in English, translate it to ENGLISH.
4. Use surrounding lines as context for ambiguous or short lines (slang, interjections, proper nouns).

Return ONLY a JSON object: {"translations": ["line 1", "line 2", ...]}
Keep translations natural and concise, suitable for subtitles.`
};

async function POST(request: Request) {
    const session = await auth();

    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!apiKey) {
        return Response.json({ error: 'Missing MISTRAL_API_KEY value' }, { status: 500 });
    }

    try {
        const { subtitles, mode = 'mix' } = (await request.json()) as { subtitles: Subtitle[]; mode?: TranslationMode };

        if (!subtitles || subtitles.length === 0) {
            return Response.json({ error: 'No subtitles provided' }, { status: 400 });
        }

        const numberedTexts = subtitles.map((sub, i) => `${i + 1}. ${sub.text}`).join('\n');

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: prompts[mode] || prompts.mix
                    },
                    {
                        role: 'user',
                        content: numberedTexts
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));

            return Response.json(
                { error: error.message || error.error?.message || `Error Mistral API (${response.status})` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return Response.json({ error: 'Empty response from Mistral' }, { status: 500 });
        }

        const parsed = JSON.parse(content);
        const translations: string[] = parsed.translations;

        if (!Array.isArray(translations) || translations.length !== subtitles.length) {
            return Response.json({ error: 'Invalid translation response' }, { status: 500 });
        }

        const translated: Subtitle[] = subtitles.map((sub, i) => ({
            ...sub,
            text: translations[i]
        }));

        return Response.json(translated);
    } catch (err) {
        console.error('Translation error:', err);

        return Response.json({ error: 'Internal error during translation' }, { status: 500 });
    }
}

export { POST };
