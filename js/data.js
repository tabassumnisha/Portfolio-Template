/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* ==========================================================================
   js/data.js — portfolio DATA: gallery projects, filter categories, services, skills.
   The gallery grid, filter buttons, service cards and skill rings are all generated
   from this file (see js/gallery.js, js/services.js).
   Add a project / service by adding one object — no HTML copy-pasting.
   ========================================================================== */
window.PortfolioData = {

  /* Filter buttons. "all" is added automatically. `id` must match a project's `category`. */
  categories: [
    { id: "branding", label: "Branding" },
    { id: "social",   label: "Social Media" },
    { id: "print",    label: "Print Design" },
    { id: "web",      label: "Web Design" }
  ],

  /* Gallery projects. `image` lives in assets/images/. `alt` is required (accessibility). */
  projects: [
    { id: "brand-identity", title: "Brand Identity",    subtitle: "Logo Design",         category: "branding", image: "project-01-brand-identity.jpg",       alt: "Sample brand identity board with logo, colour palette and typography" },
    { id: "packaging",      title: "Product Design",    subtitle: "Packaging Design",    category: "print",    image: "project-02-product-packaging.jpg",    alt: "Sample product packaging design with box, bottle and shopping bag" },
    { id: "social-post",    title: "Social Media Post", subtitle: "Social Media Design", category: "social",   image: "project-03-social-media.jpg",         alt: "Sample social media post layouts shown on a phone screen" },
    { id: "stationery",     title: "Brand Stationery",  subtitle: "Stationery Design",   category: "branding", image: "project-04-brand-stationery.jpg",     alt: "Sample brand stationery set with folder, letterhead and business cards" },
    { id: "ui-ux",          title: "UI/UX Design",      subtitle: "App Interface",       category: "web",      image: "project-05-ui-ux.jpg",                alt: "Sample dashboard interface on laptop and mobile" },
    { id: "business-card",  title: "Print Design",      subtitle: "Business Card",       category: "print",    image: "project-06-print-business-card.jpg",  alt: "Sample front and back business card design" }
  ],

  /* The project (by id) shown in the "Featured Project" band. */
  featuredProjectId: "brand-identity",
  featuredText: "A selected work sample presented as a featured case study. Replace it with your best project.",

  /* Service cards. `icon` is an id from the SVG sprite in index.html (i-briefcase, i-image, i-code, i-globe, i-heart, i-rocket). */
  services: [
    { icon: "i-briefcase", title: "Brand Identity",      text: "Logos, colour systems and brand guidelines that make your business instantly recognisable." },
    { icon: "i-image",     title: "Social Media Design", text: "Scroll-stopping posts, covers and campaign graphics tailored to each platform." },
    { icon: "i-heart",     title: "Print & Packaging",   text: "Business cards, brochures and packaging prepared print-ready for any printer." },
    { icon: "i-code",      title: "UI/UX Design",        text: "Clean, usable interfaces for websites and apps, from wireframes to final screens." },
    { icon: "i-globe",     title: "Website Design",      text: "Responsive, fast landing pages and portfolio sites designed around your goals." },
    { icon: "i-rocket",    title: "Creative Direction",  text: "End-to-end visual direction so every touchpoint feels consistent and professional." }
  ],

  /* Skill rings: `level` is a percentage (0-100). `ring` picks the gradient: "A" or "B". */
  skills: [
    { name: "Photoshop",  short: "PS",    level: 95, ring: "B" },
    { name: "Illustrator", short: "AI",   level: 90, ring: "A" },
    { name: "Figma",      short: "Fg",    level: 85, ring: "A" },
    { name: "Adobe XD",   short: "XD",    level: 80, ring: "B" },
    { name: "HTML5",      short: "HTML",  level: 75, ring: "B" },
    { name: "CSS3",       short: "CSS",   level: 70, ring: "B" },
    { name: "JavaScript", short: "JS",    level: 65, ring: "B" },
    { name: "React",      short: "React", level: 60, ring: "B" }
  ],

  otherSkills: ["Branding", "Social Media Design", "UI/UX Design", "Print Design", "Typography", "Color Theory", "Creative Thinking", "Problem Solving"]
};
