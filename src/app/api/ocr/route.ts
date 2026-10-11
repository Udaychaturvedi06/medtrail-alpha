import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 10;

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

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const sizeInBytes = (imageBase64.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 50) {
      return NextResponse.json({ 
        success: false, 
        error: `Payload too large (${sizeInMB.toFixed(2)} MB). Maximum allowed size is 50 MB.` 
      }, { status: 413 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const prompt = `
      You are an expert pharmacist and medical AI. 
      Analyze this image (which may be a doctor's handwritten prescription OR a medicine strip).
      
      Instructions:
      1. If it's a doctor's prescription, extract the doctor's name, patient diagnosis/symptoms, any general advice/notes (e.g. 'drink warm water'), and the next follow-up visit date.
      2. If it's a single medicine strip, leave doctor/diagnosis fields blank, but extract the drug details.
      3. Extract ALL medications listed.
      4. Crucially: Doctors have terrible handwriting. Use your medical knowledge to infer the CORRECT spelling of the drug name and standardize it (e.g. if it looks like 'Paracotmal', correct it to 'Paracetamol').
      5. Extract the duration for each drug (how long to take it, e.g. '5 days', '1 month').
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
        temperature: 0.1,
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            documentType: { type: 'STRING', description: 'Either PRESCRIPTION or MEDICINE_STRIP' },
            doctorName: { type: 'STRING', description: 'Name of the doctor or clinic, if visible' },
            diagnosis: { type: 'STRING', description: 'Patient diagnosis, symptoms, or indications' },
            advice: { type: 'STRING', description: 'General advice, diet, or notes (e.g., drink warm water)' },
            followUp: { type: 'STRING', description: 'Next follow-up date or timeline (e.g., after 15 days)' },
            medications: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  medicationName: { type: 'STRING', description: 'Corrected/standardized generic or brand name' },
                  dosage: { type: 'STRING', description: 'Dosage amount (e.g., 500mg, 1 tablet)' },
                  frequency: { type: 'STRING', description: 'How often to take (e.g., twice a day, morning/night)' },
                  duration: { type: 'STRING', description: 'How long to take it (e.g., 5 days, 1 month)' },
                  confidenceScore: { type: 'INTEGER', description: '0 to 100 based on readability' }
                },
                required: ['medicationName']
              }
            }
          },
          required: ['documentType', 'medications']
        }
      },
    };

    // Multi-model failover cascade: If Google reports high demand on one model,
    // automatically fallback to the next stable flash model so the user never gets an error.
    const preferredModel = process.env.GEMINI_MODEL;
    const modelCandidates = [
      ...(preferredModel ? [preferredModel] : []),
      'gemini-2.5-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.6-flash'
    ];
    const uniqueModels = Array.from(new Set(modelCandidates));

    let lastError: any = null;
    let structuredData: any = null;

    for (const model of uniqueModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const textOutput = data.candidates[0].content.parts[0].text;
          structuredData = JSON.parse(textOutput);
          break; // Extraction succeeded!
        } else {
          const errMsg = data?.error?.message || `HTTP ${response.status}`;
          console.warn(`[OCR Failover] Model ${model} reported error: ${errMsg}. Trying fallback...`);
          lastError = errMsg;
        }
      } catch (err: any) {
        console.warn(`[OCR Failover] Network error with ${model}: ${err.message}. Trying fallback...`);
        lastError = err.message;
      }
    }

    if (!structuredData) {
      return NextResponse.json({ 
        error: `Gemini API Error: ${lastError || 'All models temporarily busy. Please retry shortly.'}` 
      }, { status: 500 });
    }

    // Provide fallback structure to prevent frontend crashes
    const safeData = {
      documentType: structuredData.documentType || 'UNKNOWN',
      doctorName: structuredData.doctorName || '',
      diagnosis: structuredData.diagnosis || '',
      advice: structuredData.advice || '',
      followUp: structuredData.followUp || '',
      medications: Array.isArray(structuredData.medications) ? structuredData.medications : []
    };

    return NextResponse.json({ success: true, data: safeData });
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
