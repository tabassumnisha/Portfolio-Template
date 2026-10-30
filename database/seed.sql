-- ============================================================================
-- database/seed.sql — placeholder sample content for Creative Portfolio CMS
--
-- Applied automatically after schema.sql when the `settings` table is empty
-- (disable with SEED_SAMPLE_DATA=false). Every value is a placeholder: replace it
-- in the admin panel. No users or passwords are created here.
-- Idempotent: INSERT OR IGNORE, so running it twice changes nothing.
-- ============================================================================

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO categories (id, label, sort_order) VALUES
  ('branding', 'Branding',     1),
  ('social',   'Social Media', 2),
  ('print',    'Print Design', 3),
  ('web',      'Web Design',   4);

INSERT OR IGNORE INTO projects (id, title, subtitle, category_id, image, alt_text, sort_order, is_published, is_featured) VALUES
  ('brand-identity', 'Brand Identity',    'Logo Design',         'branding', 'assets/images/project-01-brand-identity.jpg',      'Sample brand identity board with logo, colour palette and typography', 1, 1, 1),
  ('packaging',      'Product Design',    'Packaging Design',    'print',    'assets/images/project-02-product-packaging.jpg',   'Sample product packaging design with box, bottle and shopping bag',   2, 1, 0),
  ('social-post',    'Social Media Post', 'Social Media Design', 'social',   'assets/images/project-03-social-media.jpg',        'Sample social media post layouts shown on a phone screen',            3, 1, 0),
  ('stationery',     'Brand Stationery',  'Stationery Design',   'branding', 'assets/images/project-04-brand-stationery.jpg',    'Sample brand stationery set with folder, letterhead and business cards', 4, 1, 0),
  ('ui-ux',          'UI/UX Design',      'App Interface',       'web',      'assets/images/project-05-ui-ux.jpg',               'Sample dashboard interface on laptop and mobile',                     5, 1, 0),
  ('business-card',  'Print Design',      'Business Card',       'print',    'assets/images/project-06-print-business-card.jpg', 'Sample front and back business card design',                          6, 1, 0);

INSERT OR IGNORE INTO services (id, icon, title, body, sort_order) VALUES
  (1, 'i-briefcase', 'Brand Identity',      'Logos, colour systems and brand guidelines that make your business instantly recognisable.', 1),
  (2, 'i-image',     'Social Media Design', 'Scroll-stopping posts, covers and campaign graphics tailored to each platform.',            2),
  (3, 'i-heart',     'Print & Packaging',   'Business cards, brochures and packaging prepared print-ready for any printer.',              3),
  (4, 'i-code',      'UI/UX Design',        'Clean, usable interfaces for websites and apps, from wireframes to final screens.',          4),
  (5, 'i-globe',     'Website Design',      'Responsive, fast landing pages and portfolio sites designed around your goals.',             5),
  (6, 'i-rocket',    'Creative Direction',  'End-to-end visual direction so every touchpoint feels consistent and professional.',         6);

INSERT OR IGNORE INTO skills (id, name, short_label, level, ring, sort_order) VALUES
  (1, 'Photoshop',   'PS',    95, 'B', 1),
  (2, 'Illustrator', 'AI',    90, 'A', 2),
  (3, 'Figma',       'Fg',    85, 'A', 3),
  (4, 'Adobe XD',    'XD',    80, 'B', 4),
  (5, 'HTML5',       'HTML',  75, 'B', 5),
  (6, 'CSS3',        'CSS',   70, 'B', 6),
  (7, 'JavaScript',  'JS',    65, 'B', 7),
  (8, 'React',       'React', 60, 'B', 8);

INSERT OR IGNORE INTO other_skills (id, name, sort_order) VALUES
  (1, 'Branding',            1),
  (2, 'Social Media Design', 2),
  (3, 'UI/UX Design',        3),
  (4, 'Print Design',        4),
  (5, 'Typography',          5),
  (6, 'Color Theory',        6),
  (7, 'Creative Thinking',   7),
  (8, 'Problem Solving',     8);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('owner.name',          'Your Name'),
  ('owner.initials',      'YN'),
  ('owner.role',          'Graphic Designer & Digital Creator'),
  ('owner.intro',         'I create visually stunning designs that bring ideas to life. Passionate about modern design, branding and digital experiences.'),
  ('owner.about',         'I''m Your Name, a passionate designer with a strong eye for detail and a love for clean, modern design. I create visuals that look beautiful, communicate clearly and build strong brand identities.'),
  ('owner.tagline',       'Turning ideas into visual stories with creativity and purpose.'),
  ('owner.quote',         'Design is not just what it looks like and feels like. Design is how it works.'),
  ('owner.location',      'Your City, Country'),
  ('owner.experience',    '2+ Years'),
  ('images.hero',         'assets/images/portrait-placeholder.webp'),
  ('images.about',        'assets/images/about-photo.jpg'),
  ('contact.whatsappNumber',   '+10000000000'),
  ('contact.whatsappGreeting', 'Hello! I found your portfolio and would like to discuss a project.'),
  ('contact.email',       'hello@example.com'),
  ('contact.website',     'https://example.com'),
  ('social.facebook',     'https://example.com/yourname'),
  ('social.x',            'https://example.com/yourname'),
  ('social.instagram',    'https://example.com/yourname'),
  ('social.github',       'https://example.com/yourname'),
  ('social.telegram',     'https://example.com/yourname'),
  ('social.reddit',       'https://example.com/yourname'),
  ('extraLinks',          '[{"label":"Behance Profile","url":"https://example.com/behance"},{"label":"Dribbble Profile","url":"https://example.com/dribbble"}]'),
  ('site.title',          'Your Name — Designer & Creative Professional'),
  ('site.description',    'Responsive creative portfolio for designers and freelancers: branding, social media, print and UI/UX design.'),
  ('site.footerQuote',    'Good Design is Good Business'),
  ('site.formNote',       'Your message is saved in the site owner''s private inbox. Your details are not shared with anyone else.'),
  ('site.featuredText',   'A selected work sample presented as a featured case study. Replace it with your best project.');
