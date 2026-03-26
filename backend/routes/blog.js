import express      from 'express';
import { ObjectId } from 'mongodb';
import { getDB }    from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function estimateReadTime(html) {
  const text  = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function autoExcerpt(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 220);
}

// ── Public: list published posts (no content field) ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const db       = getDB();
    const page     = parseInt(req.query.page)     || 1;
    const limit    = parseInt(req.query.limit)    || 12;
    const skip     = (page - 1) * limit;
    const category = req.query.category;

    const filter = { published: true };
    if (category) filter.category = category;
    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ title: re }, { excerpt: re }, { author: re }];
    }

    const [posts, total] = await Promise.all([
      db.collection('blog_posts')
        .find(filter, { projection: { content: 0 } })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('blog_posts').countDocuments(filter),
    ]);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: list ALL posts including drafts ────────────────────────────────────
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const db    = getDB();
    const posts = await db
      .collection('blog_posts')
      .find({}, { projection: { content: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: get single post by id (for editor) ─────────────────────────────────
router.get('/admin/:id', verifyToken, async (req, res) => {
  try {
    const db   = getDB();
    const post = await db
      .collection('blog_posts')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: get single published post by slug ─────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const db   = getDB();
    const post = await db
      .collection('blog_posts')
      .findOne({ slug: req.params.slug, published: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: create post ────────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { title, content, excerpt, category, tags, published, featuredImage } = req.body;

    if (!title || !content)
      return res.status(400).json({ error: 'Title and content are required' });

    let slug = generateSlug(title);
    const existing = await db.collection('blog_posts').findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const now  = new Date();
    const post = {
      title,
      slug,
      content,
      excerpt:       excerpt?.trim() || autoExcerpt(content),
      category:      category || 'Blog',
      tags:          tags     || [],
      author:        req.user.username || 'Admin',
      published:     !!published,
      featuredImage: featuredImage || '',
      publishedAt:   published ? now : null,
      createdAt:     now,
      updatedAt:     now,
      readTime:      estimateReadTime(content),
    };

    const result = await db.collection('blog_posts').insertOne(post);
    res.json({ ...post, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: update post ────────────────────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { title, content, excerpt, category, tags, published, featuredImage } = req.body;

    const existing = await db
      .collection('blog_posts')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    const now = new Date();
    await db.collection('blog_posts').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          title,
          content,
          excerpt:       excerpt?.trim() || autoExcerpt(content),
          category:      category   || existing.category,
          tags:          tags       || existing.tags,
          published:     !!published,
          featuredImage: featuredImage ?? existing.featuredImage ?? '',
          publishedAt:   published && !existing.publishedAt ? now : existing.publishedAt,
          updatedAt:     now,
          readTime:      estimateReadTime(content),
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: delete post ────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    await db.collection('blog_posts').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
