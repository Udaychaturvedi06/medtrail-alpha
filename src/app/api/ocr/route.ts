import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    // Strip the "data:image/jpeg;base64," prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
      You are a highly accurate medical OCR system.
      Extract the structured data from this image of a medicine strip or prescription.
      Return ONLY a raw JSON object with the following schema:
      {
        "medicationName": "string (brand or generic name)",
        "dosage": "string (e.g. 500mg, 10ml)",
        "frequency": "string (e.g. twice a day) - if visible, else null",
        "confidenceScore": number (0 to 100 based on readability)
      }
      Do not include markdown blocks like \`\`\`json. Just the raw JSON.
    `;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temp for highly deterministic extraction
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      const errorMessage = data?.error?.message || 'Failed to process image via Gemini';
      return NextResponse.json({ error: `Gemini API Error: ${errorMessage}` }, { status: 500 });
    }

    // Parse the response text as JSON
    let textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textOutput) {
      throw new Error('No output from Gemini');
    }
    
    // Clean markdown if it was added
    textOutput = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();

    const structuredData = JSON.parse(textOutput);

    return NextResponse.json({ success: true, data: structuredData });
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
