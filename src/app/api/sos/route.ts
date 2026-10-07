import { NextResponse } from 'next/server';

// Simple in-memory rate limiting map (IP -> { count, resetTime })
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: Request) {
  try {
    // 1. RATE LIMITING CHECK
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 3; // Max 3 SOS alerts per minute

    const userRate = rateLimit.get(ip) || { count: 0, resetTime: now + windowMs };
    
    if (now > userRate.resetTime) {
      userRate.count = 1;
      userRate.resetTime = now + windowMs;
    } else {
      userRate.count += 1;
      if (userRate.count > maxRequests) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded. Too many requests.' }, { status: 429 });
      }
    }
    rateLimit.set(ip, userRate);
    
    // ---------------------------------------------------------
    // TWILIO FREE TIER OVERRIDE
    // Because this is a Twilio Trial/Sandbox, messages can ONLY 
    // be sent to the verified number provided by the user.
    // ---------------------------------------------------------
    let to = 'whatsapp:+917999069845'; 
    
    /* 
    // TODO (Production): Uncomment this block when Twilio account is upgraded
    // to dynamically pull the Caregiver's number from the request payload.
    try {
      const bodyData = await request.json();
      if (bodyData.emergencyPhone) {
        const cleanPhone = bodyData.emergencyPhone.replace(/[^0-9+]/g, '');
        if (cleanPhone) to = `whatsapp:${cleanPhone}`;
      }
    } catch(e) {}
    */

    // 2. TWILIO LOGIC
    const TWILIO_ACCOUNT_SID = 'AC2b580cfbf6bb05276372bb7ae94de080';
    const TWILIO_AUTH_TOKEN = 'e28def86d60a3e3261c6f7ce3b582fcc';
    
    // Note: If using a Twilio Trial account, 'to' MUST be a verified number in your console.
    const from = 'whatsapp:+17372508034';
    const contentSid = 'HXfe5ab5f00277942d4d4200328b4d403c';

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // x-www-form-urlencoded body
    const body = new URLSearchParams();
    body.append('To', to);
    body.append('From', from);
    body.append('ContentSid', contentSid);

    // Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio Error:', data);
      return NextResponse.json({ success: false, error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('SOS API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
