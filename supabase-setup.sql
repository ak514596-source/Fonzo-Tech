-- =============================================================================
-- Fonzo Tech — Supabase database setup
-- =============================================================================
-- Run this ONCE in your Supabase project:
--   Supabase dashboard  ->  SQL Editor  ->  New query  ->  paste this  ->  Run.
--
-- It creates the five tables the website and team portal share, and seeds the
-- starter product catalogue. Safe to run again: it only creates what is missing
-- and only seeds products when the table is still empty.
-- =============================================================================

-- ---- Tables ----------------------------------------------------------------

create table if not exists products (
  id                  bigint generated always as identity primary key,
  title               text    not null,
  category            text    not null,
  brand               text    not null,
  model               text    not null,
  condition           text    not null,
  storage             text    not null default '',
  color               text    not null default '',
  price               real    not null,
  "originalPrice"     real,
  stock               integer not null default 0,
  rating              real    not null default 4.8,
  "reviewCount"       integer not null default 0,
  "shortDescription"  text    not null default '',
  description         text    not null default '',
  featured            boolean not null default false,
  "imageUrl"          text    not null default '',
  "visualKey"         text    not null default 'phone'
);

create table if not exists orders (
  id                  bigint generated always as identity primary key,
  "orderNumber"       text    not null,
  "customerName"      text    not null,
  "customerEmail"     text    not null,
  "customerPhone"     text    not null default '',
  "deliveryMethod"    text    not null,
  address             text    not null default '',
  "itemsJson"         text    not null,
  subtotal            real    not null,
  shipping            real    not null,
  total               real    not null,
  "paymentStatus"     text    not null default 'Payment pending',
  "orderStatus"       text    not null default 'New',
  "paymentProvider"   text    not null default 'Not connected',
  "createdAt"         text    not null default ''
);

create table if not exists users (
  id          bigint generated always as identity primary key,
  email       text   not null unique,
  name        text   not null default '',
  role        text   not null default 'customer',
  "createdAt" text   not null default ''
);

create table if not exists otp_codes (
  id          bigint  generated always as identity primary key,
  email       text    not null,
  role        text    not null,
  code        text    not null,
  "expiresAt" text    not null,
  used        boolean not null default false,
  "createdAt" text    not null default ''
);

create table if not exists sessions (
  token       text   primary key,
  "userId"    bigint not null,
  email       text   not null,
  role        text   not null,
  "createdAt" text   not null default '',
  "expiresAt" text   not null
);

-- ---- Seed catalogue (only when the products table is empty) -----------------

insert into products
  (title, category, brand, model, condition, storage, color, price, "originalPrice",
   stock, rating, "reviewCount", "shortDescription", description, featured, "visualKey")
select * from (values
  ('iPhone 15 Pro Max','iPhone','Apple','A2849','Brand New','256GB','Natural Titanium',1199,1299,12,4.9,384,'Titanium build, A17 Pro, 5x telephoto.','The iPhone 15 Pro Max delivers a titanium chassis, A17 Pro chip, customizable Action button and a 5x telephoto camera system. Every device is verified by Fonzo Tech engineers.',true,'phone'),
  ('iPhone 14','iPhone','Apple','A2649','Excellent','128GB','Midnight',619,799,22,4.7,512,'Certified pre-owned, battery health 90%+.','Certified pre-owned iPhone 14. Battery health 90%+, no visible wear, fully unlocked, includes a fast-charge USB-C cable.',false,'phone'),
  ('Samsung Galaxy S24 Ultra','Android','Samsung','SM-S928B','Brand New','512GB','Titanium Black',1349,1419,8,4.8,207,'200MP camera, S Pen, Galaxy AI.','Galaxy S24 Ultra ships sealed with full Samsung warranty. Includes the new Galaxy AI experiences and the integrated S Pen.',true,'phone'),
  ('Google Pixel 8 Pro','Android','Google','GC3VE','Like New','256GB','Obsidian',749,999,14,4.6,134,'Tensor G3, Magic Editor, 7 years of updates.','Open-box Pixel 8 Pro inspected and re-sealed by Fonzo Tech. Tensor G3 chip, computational photography stack, 7 years of OS support.',false,'phone'),
  ('MacBook Pro 14" M3 Pro','Mac','Apple','MRX33','Brand New','512GB / 18GB RAM','Space Black',1999,2099,6,4.9,88,'Liquid Retina XDR, M3 Pro chip.','MacBook Pro 14" with M3 Pro, Liquid Retina XDR display and up to 18 hours battery life. Sealed Apple stock with full one-year warranty.',true,'laptop'),
  ('MacBook Air 13" M2','Mac','Apple','MLY13','Refurbished','256GB / 8GB RAM','Midnight',899,1199,18,4.8,220,'Fanless M2, 18h battery, certified refurbished.','Certified refurbished MacBook Air M2. Battery cycle count under 50, no cosmetic defects, ships with a new MagSafe cable.',false,'laptop'),
  ('iPad Pro 12.9" M2','iPad','Apple','MNXT3','Like New','256GB Wi-Fi','Space Gray',949,1199,9,4.8,76,'Liquid Retina XDR, Apple Pencil hover.','iPad Pro 12.9" with M2 chip, Liquid Retina XDR mini-LED display, ProMotion 120Hz, and Apple Pencil hover support.',true,'tablet'),
  ('Samsung Galaxy Tab S9','iPad','Samsung','SM-X710','Brand New','128GB','Graphite',699,799,11,4.6,54,'Dynamic AMOLED 2X, S Pen included.','Galaxy Tab S9 with 11" Dynamic AMOLED 2X display, IP68 rating, Snapdragon 8 Gen 2 for Galaxy.',false,'tablet'),
  ('Meta Quest 3','VR','Meta','128GB','Brand New','128GB','White',499,549,16,4.7,412,'Mixed reality, Snapdragon XR2 Gen 2.','Meta Quest 3 standalone mixed-reality headset. Snapdragon XR2 Gen 2, 4K+ Infinite Display, full-color passthrough.',true,'vr'),
  ('Apple Vision Pro','VR','Apple','MQL83','Brand New','256GB','Silver',3499,null,3,4.5,41,'Spatial computing, micro-OLED, M2 + R1.','Apple Vision Pro spatial computer. Micro-OLED displays delivering 23 million pixels, dual-chip M2 + R1 architecture.',false,'vr'),
  ('Sonos Era 300','Speakers','Sonos','E30','Brand New','','Matte Black',449,499,20,4.7,98,'Spatial audio, Wi-Fi + Bluetooth.','Sonos Era 300 spatial audio speaker with Dolby Atmos, six drivers, Wi-Fi 6 and Bluetooth 5.0.',false,'speaker'),
  ('Bose SoundLink Max','Speakers','Bose','SLM','Brand New','','Blue Dusk',399,null,15,4.6,132,'Portable, 20-hour battery, IP67.','Bose SoundLink Max portable Bluetooth speaker. 20-hour battery, IP67 dust and water resistance, USB-C charging.',true,'speaker'),
  ('AirPods Pro (2nd gen, USB-C)','Accessories','Apple','MTJV3','Brand New','','White',229,249,40,4.9,1244,'ANC, Adaptive Audio, USB-C case.','AirPods Pro (2nd generation) with USB-C MagSafe case, Adaptive Audio, Personalized Spatial Audio.',false,'accessory'),
  ('Anker 65W GaN Charger','Accessories','Anker','A2664','Brand New','','Black',39,49,80,4.8,612,'Compact GaN II, fast-charges MacBooks.','Compact 65W GaN II charger that fast-charges MacBook Air M2, iPhone 15 series and Galaxy flagships.',false,'accessory')
) as seed
where not exists (select 1 from products);

-- ---- Done ------------------------------------------------------------------
-- Next: copy your Project URL and service_role key into the environment
-- variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see SUPABASE_SETUP.md).
