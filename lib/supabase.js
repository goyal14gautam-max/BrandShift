import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function saveAudit({
  brandName, industry, brandAge, targetAudience,
  websiteUrl, instagramHandle, challenge,
  scraped_homepage, scraped_about, scraped_blog,
  scraped_instagram, scraped_comp1, scraped_comp2,
  scoreData,
}) {
  const supabase = getClient();
  const { error } = await supabase.from('brand_audits').insert({
    brand_name:        brandName,
    industry,
    brand_age:         brandAge,
    target_audience:   targetAudience,
    website_url:       websiteUrl,
    instagram_handle:  instagramHandle,
    challenge,
    scraped_homepage,
    scraped_about,
    scraped_blog,
    scraped_instagram,
    scraped_comp1,
    scraped_comp2,
    score_json:        scoreData,
    overall_score:     scoreData?.overall_score ?? null,
    rebrand_urgency:   scoreData?.rebrand_urgency ?? null,
    data_confidence:   scoreData?.data_confidence ?? null,
  });
  if (error) throw error;
}

export async function getPreviousAudits(brandName) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_audits')
    .select('id, created_at, overall_score, rebrand_urgency, data_confidence, score_json')
    .ilike('brand_name', brandName)
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) {
    console.error('getPreviousAudits error:', error.message);
    return [];
  }
  return data ?? [];
}
