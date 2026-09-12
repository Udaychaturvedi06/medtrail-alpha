import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const TWILIO_ACCOUNT_SID = 'AC2b580cfbf6bb05276372bb7ae94de080';
    const TWILIO_AUTH_TOKEN = 'e28def86d60a3e3261c6f7ce3b582fcc';
    
    // In production, the "To" number would come from the Caregiver's profile in the database.
    // For this demo, we are using the hardcoded verified number provided by the user.
    const to = 'whatsapp:+917999069845';
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
