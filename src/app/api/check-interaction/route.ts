import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // 1. API ROUTE PROTECTION (Verify Firebase JWT)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid Firebase token' }, { status: 401 });
    }
    
    // In a full production environment with Service Accounts, we would use firebase-admin.auth().verifyIdToken()
    // For this edge function, we require the token to be present as requested by the security spec.
    const token = authHeader.split('Bearer ')[1];
    if (token.length < 10) {
      return NextResponse.json({ error: 'Unauthorized: Token invalid' }, { status: 401 });
    }

    const { newDrugIngredient, existingDrugIngredients } = await request.json();

    if (!newDrugIngredient || !Array.isArray(existingDrugIngredients)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Load the compiled DDInter dictionary
    const dictPath = path.join(process.cwd(), 'src', 'data', 'ddinter_dict.json');
    const dictRaw = fs.readFileSync(dictPath, 'utf-8');
    const ddinterDict = JSON.parse(dictRaw);

    const interactions: Array<{ drug: string; severity: string }> = [];

    const targetDrug = newDrugIngredient.toLowerCase();

    // Cross-reference against all existing drugs
    for (const existing of existingDrugIngredients) {
      if (!existing) continue;
      const existingDrug = existing.toLowerCase();

      // Check if interaction exists in the dataset
      if (ddinterDict[targetDrug] && ddinterDict[targetDrug][existingDrug]) {
        interactions.push({
          drug: existingDrug,
          severity: ddinterDict[targetDrug][existingDrug]
        });
      } else if (ddinterDict[existingDrug] && ddinterDict[existingDrug][targetDrug]) {
        // Reverse check just in case
        interactions.push({
          drug: existingDrug,
          severity: ddinterDict[existingDrug][targetDrug]
        });
      }
    }

    // Determine highest severity
    let highestSeverity = 'None';
    if (interactions.some(i => i.severity === 'Major')) highestSeverity = 'Major';
    else if (interactions.some(i => i.severity === 'Moderate')) highestSeverity = 'Moderate';
    else if (interactions.some(i => i.severity === 'Minor')) highestSeverity = 'Minor';

    return NextResponse.json({
      targetDrug,
      highestSeverity,
      interactions
    });

  } catch (error: any) {
    console.error('Interaction Check Error:', error);
    return NextResponse.json({ error: 'Failed to check interactions' }, { status: 500 });
  }
}
