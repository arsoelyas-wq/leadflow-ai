import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

interface PostCallParams {
  callId:             string;
  userId:             string;
  leadId?:            string | null;
  transcript:         string;
  durationSec:        number;
  language:           string;
  conversationStyle?: string;
}

export async function runPostCallAnalysis(params: PostCallParams): Promise<void> {
  const { callId, userId, leadId, transcript, durationSec, conversationStyle } = params;

  const turns = transcript.split('\n').filter(l => l.trim()).length;
  if (turns < 3) {
    await getSupabase().from('call_intelligence').insert({
      user_id:            userId,
      lead_id:            leadId || null,
      call_id:            callId,
      conversation_style: conversationStyle || 'consultant',
      duration_sec:       durationSec,
      outcome:            'no_answer',
      sentiment_score:    5,
      interest_score:     1,
      objections:         [],
      next_action:        'call_again',
      transcript_summary: 'Çok kısa görüşme — yanıt alınamadı.',
    });
    return;
  }

  const systemPrompt = `Sen bir satış araması analiz uzmanısın. Sana bir satış aramasının transkriptini vereceğim.
JSON formatında analiz yap. Kesinlikle sadece JSON döndür, başka hiçbir şey yazma.

JSON şeması:
{
  "outcome": "appointment|callback|rejected|no_answer|busy|unknown",
  "sentiment_score": 1-10,
  "interest_score": 1-10,
  "objections": ["string array — ana itirazlar"],
  "next_action": "call_again|close|remove|nurture",
  "transcript_summary": "2-3 cümle özet"
}

Açıklamalar:
- outcome: appointment=randevu alındı, callback=tekrar aranacak, rejected=reddetti, no_answer=yanıt yok, unknown=belirsiz
- sentiment_score: 1=çok olumsuz, 10=çok olumlu
- interest_score: 1=hiç ilgisiz, 10=çok ilgili
- next_action: call_again=geri ara, close=kapat (satış yapıldı), remove=çıkar (DNC), nurture=takipte tut`;

  const userPrompt = `Transkript:\n${transcript}\n\nArama süresi: ${durationSec} saniye\nKonuşma stili: ${conversationStyle || 'consultant'}`;

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const analysis = JSON.parse(jsonMatch[0]);

    await getSupabase().from('call_intelligence').insert({
      user_id:            userId,
      lead_id:            leadId || null,
      call_id:            callId,
      conversation_style: conversationStyle || 'consultant',
      duration_sec:       durationSec,
      outcome:            analysis.outcome || 'unknown',
      sentiment_score:    Math.min(10, Math.max(1, analysis.sentiment_score || 5)),
      interest_score:     Math.min(10, Math.max(1, analysis.interest_score || 5)),
      objections:         Array.isArray(analysis.objections) ? analysis.objections.slice(0, 5) : [],
      next_action:        analysis.next_action || 'call_again',
      transcript_summary: analysis.transcript_summary || '',
    });

    if (analysis.outcome && analysis.outcome !== 'unknown') {
      const outcomeMap: Record<string, string> = {
        appointment: 'positive',
        callback:    'neutral',
        rejected:    'negative',
        no_answer:   'neutral',
        busy:        'neutral',
        unknown:     'neutral',
      };
      await getSupabase()
        .from('voice_calls')
        .update({ outcome: outcomeMap[analysis.outcome] || 'neutral', notes: analysis.transcript_summary })
        .eq('id', callId)
        .eq('outcome', 'unknown');
    }

    console.log(`[PostCall] Analysis done: call=${callId} outcome=${analysis.outcome} sentiment=${analysis.sentiment_score} interest=${analysis.interest_score}`);
  } catch (e: any) {
    console.error(`[PostCall] Analysis failed for call ${callId}:`, e.message?.slice(0, 100));
  }
}
