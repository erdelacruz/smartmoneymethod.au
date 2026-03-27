import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdBanner from '../components/AdBanner';

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>
      <img
        className="lightbox-img"
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

export default function BlogPostPage() {
  const { slug }  = useParams();
  const [post,        setPost]        = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const contentRef  = useRef(null);
  const sidebarInsRef = useRef(null);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  const TYPE_BACK = {
    'Trading Strategy':  '/learn/trading-strategy',
    'Investing Strategy': '/learn/investing-strategy',
    'Blog':              '/learn/blog',
  };
  const backHref = post ? (TYPE_BACK[post.category] || '/learn/blog') : '/learn/blog';
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/blog/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Post not found');
        return r.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
        document.title = `${data.title} — Smart Money Method Australia`;
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    return () => { document.title = 'Smart Money Method Australia — Budget, Invest & Grow'; };
  }, [slug]);

  // Show sidebar only if the ad fills (data-ad-status !== 'unfilled')
  useEffect(() => {
    const ins = sidebarInsRef.current;
    if (!ins) return;

    const check = () => {
      const status = ins.getAttribute('data-ad-status');
      setShowSidebar(status !== null && status !== 'unfilled');
    };

    // Watch for AdSense setting data-ad-status attribute
    const observer = new MutationObserver(check);
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

    // Fallback: after 3s if still no status, assume no ad
    const timer = setTimeout(check, 3000);

    return () => { observer.disconnect(); clearTimeout(timer); };
  }, []);

  // Attach click-to-enlarge on all content images
  useEffect(() => {
    if (!contentRef.current) return;
    const imgs = contentRef.current.querySelectorAll('img');
    imgs.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.onclick = () => setLightboxSrc(img.src);
    });
  }, [post]);

  if (loading) {
    return <div className="blog-post-page"><p className="loading-text" style={{padding:'80px 24px'}}>Loading…</p></div>;
  }

  if (error) {
    return (
      <div className="blog-post-page">
        <div className="blog-post-notfound">
          <h2>Post not found</h2>
          <p>The article you're looking for doesn't exist or has been removed.</p>
          <Link to={backHref} className="blog-back-link">← Back to Learn</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="blog-post-page">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}
      <div className="blog-post-header page-hero">
        <div className="section-eyebrow">{post.category}</div>
        <h1 className="blog-post-title">{post.title}</h1>
        <div className="blog-post-meta">
          <span className="blog-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            {post.author}
          </span>
          <span className="blog-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })
              : ''}
          </span>
          <span className="blog-meta-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {post.readTime} min read
          </span>
        </div>
      </div>

      <div className="blog-post-wrap">
        <div className={`blog-post-layout${showSidebar ? '' : ' blog-post-layout--centered'}`}>

          {/* ── Main content ── */}
          <div className="blog-post-card">
            {post.featuredImage && (
              <div className="blog-post-featured-img">
                <img src={post.featuredImage} alt={post.title} />
              </div>
            )}

            <div className="blog-post-body">
              <div
                ref={contentRef}
                className="blog-post-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <AdBanner adSlot="4503887875" adFormat="auto" />

              {post.tags?.length > 0 && (
                <div className="blog-post-tags">
                  {post.tags.map(t => <span key={t} className="blog-tag">{t}</span>)}
                </div>
              )}

              <Link to={backHref} className="blog-back-link">← Back to Learn</Link>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="blog-post-sidebar" style={{ display: showSidebar ? '' : 'none' }}>
            <div className="blog-sidebar-ad-card">
              <AdBanner adSlot="7448781261" adFormat="auto" insRef={sidebarInsRef} />
            </div>
          </aside>

        </div>
      </div>
    </article>
  );
}
