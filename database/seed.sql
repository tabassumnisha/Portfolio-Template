-- ============================================================================
-- database/seed.sql — demo data for the OPTIONAL schema in schema.sql
-- Generated from Project/js/data.js (the placeholder content shown on the live demo).
-- Run schema.sql first. Placeholders only: no real names, contacts or credentials.
-- ============================================================================

INSERT INTO categories (id, label, sort_order) VALUES
  ('branding', 'Branding', 1),
  ('social', 'Social Media', 2),
  ('print', 'Print Design', 3),
  ('web', 'Web Design', 4);

INSERT INTO projects (id, title, subtitle, category_id, image_file, alt_text, sort_order) VALUES
  ('brand-identity', 'Brand Identity', 'Logo Design', 'branding', 'project-01-brand-identity.jpg', 'Sample brand identity board with logo, colour palette and typography', 1),
  ('packaging', 'Product Design', 'Packaging Design', 'print', 'project-02-product-packaging.jpg', 'Sample product packaging design with box, bottle and shopping bag', 2),
  ('social-post', 'Social Media Post', 'Social Media Design', 'social', 'project-03-social-media.jpg', 'Sample social media post layouts shown on a phone screen', 3),
  ('stationery', 'Brand Stationery', 'Stationery Design', 'branding', 'project-04-brand-stationery.jpg', 'Sample brand stationery set with folder, letterhead and business cards', 4),
  ('ui-ux', 'UI/UX Design', 'App Interface', 'web', 'project-05-ui-ux.jpg', 'Sample dashboard interface on laptop and mobile', 5),
  ('business-card', 'Print Design', 'Business Card', 'print', 'project-06-print-business-card.jpg', 'Sample front and back business card design', 6);

INSERT INTO services (id, icon, title, body, sort_order) VALUES
  (1, 'i-briefcase', 'Brand Identity', 'Logos, colour systems and brand guidelines that make your business instantly recognisable.', 1),
  (2, 'i-image', 'Social Media Design', 'Scroll-stopping posts, covers and campaign graphics tailored to each platform.', 2),
  (3, 'i-heart', 'Print & Packaging', 'Business cards, brochures and packaging prepared print-ready for any printer.', 3),
  (4, 'i-code', 'UI/UX Design', 'Clean, usable interfaces for websites and apps, from wireframes to final screens.', 4),
  (5, 'i-globe', 'Website Design', 'Responsive, fast landing pages and portfolio sites designed around your goals.', 5),
  (6, 'i-rocket', 'Creative Direction', 'End-to-end visual direction so every touchpoint feels consistent and professional.', 6);

INSERT INTO skills (name, short_label, level, ring, sort_order) VALUES
  ('Photoshop', 'PS', 95, 'B', 1),
  ('Illustrator', 'AI', 90, 'A', 2),
  ('Figma', 'Fg', 85, 'A', 3),
  ('Adobe XD', 'XD', 80, 'B', 4),
  ('HTML5', 'HTML', 75, 'B', 5),
  ('CSS3', 'CSS', 70, 'B', 6),
  ('JavaScript', 'JS', 65, 'B', 7),
  ('React', 'React', 60, 'B', 8);

INSERT INTO other_skills (name, sort_order) VALUES
  ('Branding', 1),
  ('Social Media Design', 2),
  ('UI/UX Design', 3),
  ('Print Design', 4),
  ('Typography', 5),
  ('Color Theory', 6),
  ('Creative Thinking', 7),
  ('Problem Solving', 8);

INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('featuredProjectId', 'brand-identity'),
  ('featuredText', 'A selected work sample presented as a featured case study. Replace it with your best project.');
