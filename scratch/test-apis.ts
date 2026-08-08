import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testApis() {
  const text = 'Imaginea cu Papa Francisc purtând o geacă puffoasă albă a fost generată de inteligența artificială.';
  console.log('Testing claim:', text);
  console.log('GEMINI_API_KEY present:', Boolean(process.env.GEMINI_API_KEY));
  console.log('GOOGLE_FACT_CHECK_API_KEY present:', Boolean(process.env.GOOGLE_FACT_CHECK_API_KEY));
  console.log('TAVILY_API_KEY present:', Boolean(process.env.TAVILY_API_KEY));

  const factCheckKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (factCheckKey) {
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${factCheckKey}&query=${encodeURIComponent('Pope Francis puffer jacket')}&languageCode=en`;
    const res = await fetch(url);
    console.log('Google Fact Check API status:', res.status);
    const data = await res.json();
    console.log('Google Fact Check results count:', data.claims?.length || 0);
    if (data.claims?.length) {
      console.log('Sample match:', data.claims[0].text, 'Rating:', data.claims[0].claimReview?.[0]?.textualRating);
    }
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tavilyKey}` },
      body: JSON.stringify({ query: 'Pope Francis puffer jacket AI Midjourney', max_results: 5 }),
    });
    console.log('Tavily API status:', res.status);
    const data = await res.json();
    console.log('Tavily results count:', data.results?.length || 0);
    if (data.results?.length) {
      console.log('Sample Tavily match:', data.results[0].title, data.results[0].url);
    }
  }
}

testApis();
