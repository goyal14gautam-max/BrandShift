import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';

export async function POST(request) {
  try {
    const { brandName, scoreData, shareUrl, contactName, senderName } = await request.json();

    const response = await callClaude({
      model: 'claude-sonnet-4-0',
      max_tokens: 600,
      system: `You are writing a cold outreach email for BrandShift, an AI brand analysis tool. The email should feel personal, specific, and non-salesy. It should show genuine insight about the brand. Never use generic phrases like "I hope this email finds you well". Be direct and specific. Keep it under 150 words.`,
      messages: [{
        role: 'user',
        content: `Write a cold outreach email to the marketing team of ${brandName}.

Their brand details:
Overall score: ${scoreData.overall_score}/100
Biggest gap: ${scoreData.biggest_gap}
Biggest strength: ${scoreData.biggest_strength}
Key evidence: ${scoreData.evidence_quotes?.[0]?.quote || ''}
Verdict: ${scoreData.verdict}

The email should:
1. Open with one specific observation about their brand — not generic praise
2. Mention their score naturally (not as a judgment but as data)
3. Reference one specific thing we found on their website or social media
4. Have a clear CTA to view the full report
5. Sign off simply

Share URL for their report: ${shareUrl}
Contact name (if known): ${contactName || 'there'}
Sender name: ${senderName || 'BrandShift'}

Return ONLY this JSON:
{
  "subject": string,
  "body": string,
  "preview_text": string
}`,
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid response from Claude');

    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error('generate-email error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
