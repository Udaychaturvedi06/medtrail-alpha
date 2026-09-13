import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drugName = searchParams.get('name');

  if (!drugName) {
    return NextResponse.json({ error: 'Missing drug name' }, { status: 400 });
  }

  try {
    // Ping the public NIH RxNorm API
    const response = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`);
    
    if (!response.ok) {
      throw new Error(`NIH API Error: ${response.status}`);
    }

    const data = await response.json();
    let rxnormId = data.idGroup?.rxnormId?.[0] || null;
    let matchType = 'exact';

    if (!rxnormId) {
      // Approximate match
      const approxResponse = await fetch(`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`);
      const approxData = await approxResponse.json();
      rxnormId = approxData.approximateGroup?.candidate?.[0]?.rxcui || null;
      matchType = 'approximate';
      
      if (!rxnormId) {
        return NextResponse.json({ error: 'Drug not found', rxcui: null }, { status: 404 });
      }
    }

    // Now get the generic active ingredient name for DDInter lookup
    let ingredientName = drugName.toLowerCase();
    try {
      const ingResponse = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxnormId}/related.json?tty=IN`);
      const ingData = await ingResponse.json();
      const fetchedIngredient = ingData.relatedGroup?.conceptGroup?.[0]?.conceptProperties?.[0]?.name;
      if (fetchedIngredient) {
        ingredientName = fetchedIngredient.toLowerCase();
      }
    } catch (err) {
      console.warn('Failed to fetch ingredient name', err);
    }

    return NextResponse.json({ 
      rxcui: rxnormId,
      matchType,
      originalName: drugName,
      ingredient: ingredientName
    });

  } catch (error: any) {
    console.error('RxNorm API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from RxNorm' }, { status: 500 });
  }
}
