import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: Request) {
  try {
    // 1. RATE LIMITING CHECK
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 10; // Max 10 OCR scans per minute

    const userRate = rateLimit.get(ip) || { count: 0, resetTime: now + windowMs };
    
    if (now > userRate.resetTime) {
      userRate.count = 1;
      userRate.resetTime = now + windowMs;
    } else {
      userRate.count += 1;
      if (userRate.count > maxRequests) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded. Please wait before scanning again.' }, { status: 429 });
      }
    }
    rateLimit.set(ip, userRate);

    // 2. GEMINI OCR LOGIC
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 3. PAYLOAD SIZE VALIDATION
    // Base64 string size in bytes is roughly (length * 3) / 4
    const sizeInBytes = (imageBase64.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    // Hard limit at 50 MB to prevent memory overload
    if (sizeInMB > 50) {
      return NextResponse.json({ 
        success: false, 
        error: `Payload too large (${sizeInMB.toFixed(2)} MB). Maximum allowed size is 50 MB.` 
      }, { status: 413 });
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
      Prescriptions usually contain MULTIPLE medications. Extract ALL of them.
      Return ONLY a raw JSON array of objects with the following schema:
      [
        {
          "medicationName": "string (brand or generic name)",
          "dosage": "string (e.g. 500mg, 10ml, etc)",
          "frequency": "string (e.g. twice a day) - if visible, else null",
          "confidenceScore": number (0 to 100 based on readability)
        }
      ]
      Do not include markdown blocks like \`\`\`json. Just the raw JSON array.
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
