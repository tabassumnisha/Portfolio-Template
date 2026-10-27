/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* ==========================================================================
   config.example.js — the ONLY configuration file of this template.
   Every value below is a PLACEHOLDER. Replace them with your own details.
   No build step: index.html loads this file directly. Documented in HowToSetup.md.
   Never put private credentials or private URLs in this file — it is public.
   ========================================================================== */
window.SITE_CONFIG = {

  /* --- Owner / branding ------------------------------------------------- */
  owner: {
    name: "Your Name",                          // Full name. The last word is highlighted in the hero title.
    initials: "YN",                              // Short brand mark shown in the header.
    role: "Graphic Designer & Digital Creator",  // Job title shown under the hero name.
    intro: "I create visually stunning designs that bring ideas to life. Passionate about modern design, branding and digital experiences.",
    about: "I'm Your Name, a passionate designer with a strong eye for detail and a love for clean, modern design. I create visuals that look beautiful, communicate clearly and build strong brand identities.",
    tagline: "Turning ideas into visual stories with creativity and purpose.",
    quote: "Design is not just what it looks like and feels like. Design is how it works.",
    location: "Your City, Country",
    experience: "2+ Years"
  },

  /* --- Images (paths relative to index.html) ----------------------------- */
  images: {
    hero: "assets/images/portrait-placeholder.webp", // Transparent cut-out portrait for the hero (about 1000x1307).
    about: "assets/images/about-photo.jpg"           // Portrait in the About polaroid (4:5, about 960x1200).
  },

  /* --- Contact (placeholders only) --------------------------------------- */
  contact: {
    whatsappNumber: "+10000000000",   // International format. Digits are extracted automatically for wa.me.
    whatsappGreeting: "Hello! I found your portfolio and would like to discuss a project.", // Prefilled text on WhatsApp buttons.
    email: "hello@example.com",       // Shown on the page and used for the mailto: link.
    website: "https://example.com"    // Shown in the footer.
  },

  /* --- Social profiles: leave a value as "" to hide that icon ------------ */
  social: {
    facebook:  "https://example.com/yourname",
    x:         "https://example.com/yourname",
    instagram: "https://example.com/yourname",
    github:    "https://example.com/yourname",
    telegram:  "https://example.com/yourname",
    reddit:    "https://example.com/yourname"
  },

  /* --- Extra text links under "Follow Me" (remove the entries you do not need) --- */
  extraLinks: [
    { label: "Behance Profile",  url: "https://example.com/behance" },
    { label: "Dribbble Profile", url: "https://example.com/dribbble" }
  ],

  /* --- Page text ---------------------------------------------------------- */
  site: {
    title: "Your Name — Designer & Creative Professional", // Browser tab title (also edit <title> in index.html for crawlers).
    description: "Responsive creative portfolio for designers and freelancers: branding, social media, print and UI/UX design.",
    footerQuote: "Good Design is Good Business",
    formNote: "Clicking Send Message opens WhatsApp with your message. Nothing is stored or sent to a server."
  }
};
