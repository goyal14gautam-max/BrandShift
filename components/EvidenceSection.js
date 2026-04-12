'use client';

import { useState } from 'react';
import { Globe, AtSign, Target, ExternalLink } from 'lucide-react';

function LinkedInIcon({ size = 14, color = 'currentColor', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
import styles from './EvidenceSection.module.css';

// ── Tab config ────────────────────────────────────────────────
const BASE_TABS = [
  { id: 'website',     label: 'Website',     icon: Globe    },
  { id: 'instagram',   label: 'Instagram',   icon: AtSign   },
  { id: 'linkedin',    label: 'LinkedIn',    icon: LinkedInIcon },
  { id: 'competitors', label: 'Competitors', icon: Target   },
];

// ── Browser chrome mockup ─────────────────────────────────────
function BrowserMockup({ screenshotUrl, url }) {
  const displayUrl = url ? url.replace(/^https?:\/\//, '') : '';
  return (
    <div className={styles.browser}>
      <div className={styles.browserChrome}>
        <div className={styles.browserDots}>
          <span className={styles.browserDot} style={{ background: '#FF5F57' }} />
          <span className={styles.browserDot} style={{ background: '#FEBC2E' }} />
          <span className={styles.browserDot} style={{ background: '#28C840' }} />
        </div>
        <div className={styles.browserBar}>
          <Globe size={10} style={{ marginRight: 5, flexShrink: 0, color: 'var(--bs-text-tertiary)' }} />
          <span className={styles.browserUrl}>{displayUrl || 'website'}</span>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.browserExternal}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className={styles.browserScreen}>
        {screenshotUrl ? (
          <img src={screenshotUrl} alt="Website screenshot" className={styles.screenshotImg} />
        ) : (
          <div className={styles.screenshotEmpty}>
            <Globe size={28} style={{ color: 'var(--bs-text-tertiary)', marginBottom: 8 }} />
            <p className={styles.screenshotEmptyText}>Screenshot not captured</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Instagram data parser ─────────────────────────────────────
function parseInstagram(raw) {
  if (!raw) return null;
  const lines = raw.split('\n');
  const profile = { username: '', followers: '', bio: '' };
  const posts = [];
  let inPosts = false;

  for (const line of lines) {
    if (line.startsWith('Username:'))    { profile.username  = line.replace('Username:', '').trim(); continue; }
    if (line.startsWith('Followers:'))   { profile.followers = line.replace('Followers:', '').trim(); continue; }
    if (line.startsWith('Bio:'))         { profile.bio       = line.replace('Bio:', '').trim(); continue; }
    if (line.startsWith('RECENT POSTS:')){ inPosts = true; continue; }
    if (inPosts && line.startsWith('Post ')) {
      const m = line.match(/Post \d+: "(.*?)" \| Likes: ([\d,]+) \| Comments: ([\d,]+)/);
      if (m) posts.push({ caption: m[1], likes: parseInt(m[2].replace(/,/g, '')), comments: parseInt(m[3].replace(/,/g, '')) });
    }
  }

  if (!profile.username && posts.length === 0) return null;
  return { profile, posts };
}

// ── Website tab ───────────────────────────────────────────────
function WebsiteTab({ screenshot, websiteUrl, evidenceQuotes }) {
  return (
    <div className={styles.websiteTab}>
      <BrowserMockup screenshotUrl={screenshot} url={websiteUrl} />
      {evidenceQuotes && evidenceQuotes.length > 0 && (
        <div className={styles.evQuoteList}>
          {evidenceQuotes.map((ev, i) => {
            const isNeg = ev.sentiment === 'negative';
            const accent = isNeg ? 'var(--bs-orange)' : 'var(--bs-teal)';
            const badgeBg = isNeg ? 'rgba(232,98,42,0.12)' : 'rgba(46,196,160,0.12)';
            return (
              <div key={i} className={styles.evItem}>
                <div className={styles.evItemAccent} style={{ background: accent }} />
                <div className={styles.evItemBody}>
                  <div className={styles.evItemMeta}>
                    <span className={styles.evSourceBadge} style={{ background: badgeBg, color: accent }}>
                      {ev.source}
                    </span>
                    <span className={styles.evSentimentLabel} style={{ color: accent }}>
                      {isNeg ? '↓ Affecting score' : '↑ Supporting score'}
                    </span>
                  </div>
                  <p className={styles.evItemQuote}>&ldquo;{ev.quote}&rdquo;</p>
                  <p className={styles.evItemObs}>{ev.observation}</p>
                  {ev.framework_reference && (
                    <p className={styles.evItemFramework}>Impacts: {ev.framework_reference}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Instagram tab ─────────────────────────────────────────────
function InstagramTab({ rawInstagram }) {
  const data = parseInstagram(rawInstagram);

  if (!data) {
    return (
      <div className={styles.emptyTab}>
        <AtSign size={32} style={{ color: 'var(--bs-text-tertiary)', marginBottom: 12 }} />
        <p className={styles.emptyTabText}>No Instagram data was scraped for this brand.</p>
        <p className={styles.emptyTabSub}>Add an Instagram handle when running the audit to analyse social content.</p>
      </div>
    );
  }

  const { profile, posts } = data;
  const topPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3);

  return (
    <div className={styles.igTab}>
      {/* Profile bar */}
      <div className={styles.igProfile}>
        <div className={styles.igAvatar}>
          <AtSign size={20} style={{ color: 'var(--bs-violet)' }} />
        </div>
        <div className={styles.igProfileInfo}>
          <span className={styles.igHandle}>@{profile.username || 'unknown'}</span>
          <span className={styles.igFollowers}>{profile.followers} followers</span>
        </div>
        {profile.bio && (
          <p className={styles.igBio}>{profile.bio}</p>
        )}
      </div>

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className={styles.igTopPostsWrap}>
          <p className={styles.igSectionLabel}>Top posts by engagement</p>
          <div className={styles.igTopPosts}>
            {topPosts.map((p, i) => (
              <div key={i} className={styles.igPostCard}>
                <div className={styles.igPostRank}>{i + 1}</div>
                <p className={styles.igPostCaption}>{p.caption.slice(0, 160)}{p.caption.length > 160 ? '…' : ''}</p>
                <div className={styles.igPostStats}>
                  <span className={styles.igStat}>♥ {p.likes.toLocaleString()}</span>
                  <span className={styles.igStat}>💬 {p.comments.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All posts */}
      {posts.length > 0 && (
        <div className={styles.igAllPostsWrap}>
          <p className={styles.igSectionLabel}>All {posts.length} posts</p>
          <div className={styles.igAllPosts}>
            {posts.map((p, i) => (
              <div key={i} className={styles.igPostRow}>
                <span className={styles.igPostNum}>{i + 1}</span>
                <p className={styles.igPostRowCaption}>{p.caption.slice(0, 120)}{p.caption.length > 120 ? '…' : ''}</p>
                <span className={styles.igPostRowLikes}>♥ {p.likes.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Competitors tab ───────────────────────────────────────────
function CompetitorsTab({ comp1Screenshot, comp2Screenshot, comp1Name, comp2Name }) {
  const hasComp1 = comp1Name || comp1Screenshot;
  const hasComp2 = comp2Name || comp2Screenshot;

  if (!hasComp1 && !hasComp2) {
    return (
      <div className={styles.emptyTab}>
        <Target size={32} style={{ color: 'var(--bs-text-tertiary)', marginBottom: 12 }} />
        <p className={styles.emptyTabText}>No competitor data was provided.</p>
        <p className={styles.emptyTabSub}>Add competitor URLs when running the audit to enable side-by-side comparison.</p>
      </div>
    );
  }

  return (
    <div className={styles.competitorsTab}>
      {hasComp1 && (
        <div className={styles.compPanel}>
          {comp1Name && <p className={styles.compLabel}>{comp1Name}</p>}
          <BrowserMockup screenshotUrl={comp1Screenshot} url={comp1Name?.includes('.') ? `https://${comp1Name.replace(/^https?:\/\//, '')}` : null} />
        </div>
      )}
      {hasComp2 && (
        <div className={styles.compPanel}>
          {comp2Name && <p className={styles.compLabel}>{comp2Name}</p>}
          <BrowserMockup screenshotUrl={comp2Screenshot} url={comp2Name?.includes('.') ? `https://${comp2Name.replace(/^https?:\/\//, '')}` : null} />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
function LinkedInTab({ rawLinkedIn }) {
  if (!rawLinkedIn) return <p className={styles.emptyMsg}>No LinkedIn data available.</p>;
  const lines = rawLinkedIn.split('\n').filter(l => l.trim());

  const companyLine = lines.find(l => l.startsWith('Company:'));
  const followerLine = lines.find(l => l.startsWith('Followers:'));
  const industryLine = lines.find(l => l.startsWith('Industry:'));
  const aboutIdx = lines.findIndex(l => l === 'ABOUT:');
  const postsIdx = lines.findIndex(l => l === 'RECENT POSTS:');

  const aboutText = aboutIdx >= 0
    ? lines.slice(aboutIdx + 1, postsIdx > 0 ? postsIdx : aboutIdx + 6).filter(l => !l.startsWith('LINKEDIN') && !l.startsWith('Company:') && !l.startsWith('URL:')).join(' ')
    : '';

  const posts = postsIdx >= 0
    ? lines.slice(postsIdx + 1).filter(l => l.match(/^Post \d+:/)).map(l => l.replace(/^Post \d+:\s*/, '').replace(/^"/, '').replace(/"$/, ''))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Company header */}
      <div style={{ background: 'rgba(10,102,194,0.06)', border: '1px solid rgba(10,102,194,0.15)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, background: '#0A66C2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LinkedInIcon size={22} color="white" />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--bs-text-primary)' }}>{companyLine?.replace('Company: ', '') || 'Company'}</p>
          {followerLine && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bs-text-secondary)', marginTop: 2 }}>{followerLine.replace('Followers: ', '')}</p>}
          {industryLine && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)', marginTop: 2 }}>{industryLine.replace('Industry: ', '')}</p>}
        </div>
      </div>

      {/* About */}
      {aboutText && (
        <div className={styles.snippetCard}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#0A66C2', marginBottom: 8 }}>COMPANY OVERVIEW</p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-secondary)', lineHeight: 1.6 }}>{aboutText}</p>
        </div>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--bs-text-tertiary)', marginBottom: 10 }}>RECENT POSTS</p>
          {posts.map((post, i) => (
            <div key={i} className={styles.snippetCard} style={{ marginBottom: 8 }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-secondary)', lineHeight: 1.6 }}>{post}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceSection({ scrapedData, evidenceQuotes }) {
  const [activeTab, setActiveTab] = useState('website');

  const screenshots    = scrapedData?.screenshots || {};
  const rawInstagram   = scrapedData?.scraped_instagram || '';
  const rawLinkedIn    = scrapedData?.scraped_linkedin || '';
  const websiteUrl     = scrapedData?.websiteUrl || '';
  const comp1Name      = scrapedData?.comp1Name || '';
  const comp2Name      = scrapedData?.comp2Name || '';

  const hasLinkedIn = rawLinkedIn && rawLinkedIn.length > 50 && !rawLinkedIn.includes('Sign in');
  const TABS = hasLinkedIn ? BASE_TABS : BASE_TABS.filter(t => t.id !== 'linkedin');

  return (
    <div className={styles.wrap}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'website' && (
          <WebsiteTab
            screenshot={screenshots.homepage}
            websiteUrl={websiteUrl}
            evidenceQuotes={evidenceQuotes}
          />
        )}
        {activeTab === 'instagram' && (
          <InstagramTab rawInstagram={rawInstagram} />
        )}
        {activeTab === 'linkedin' && (
          <LinkedInTab rawLinkedIn={rawLinkedIn} />
        )}
        {activeTab === 'competitors' && (
          <CompetitorsTab
            comp1Screenshot={screenshots.comp1}
            comp2Screenshot={screenshots.comp2}
            comp1Name={comp1Name}
            comp2Name={comp2Name}
          />
        )}
      </div>
    </div>
  );
}
