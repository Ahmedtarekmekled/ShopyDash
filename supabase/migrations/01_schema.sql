-- =====================================================
-- ABO-HOMMOS MARKETPLACE - DATABASE SCHEMA
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('CUSTOMER', 'SHOP_OWNER', 'ADMIN');
CREATE TYPE shop_status AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
CREATE TYPE order_status AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- =====================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role DEFAULT 'CUSTOMER' NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- REGIONS & DISTRICTS
-- =====================================================

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 10.00 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SHOPS
-- =====================================================

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT NOT NULL,
  
  status shop_status DEFAULT 'PENDING' NOT NULL,
  is_open BOOLEAN DEFAULT TRUE NOT NULL,
  
  rating DECIMAL(2, 1) DEFAULT 0.0,
  total_ratings INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  opening_time TIME DEFAULT '08:00:00',
  closing_time TIME DEFAULT '22:00:00',
  
  delivery_fee DECIMAL(10, 2) DEFAULT 10.00,
  min_order_amount DECIMAL(10, 2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- PRODUCTS
-- =====================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL,
  description TEXT,
  
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2),
  
  sku TEXT,
  barcode TEXT,
  
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  low_stock_threshold INTEGER DEFAULT 5,
  track_inventory BOOLEAN DEFAULT TRUE NOT NULL,
  
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  
  unit TEXT DEFAULT 'piece',
  weight DECIMAL(10, 3),
  
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(shop_id, slug)
);

-- =====================================================
-- CARTS
-- =====================================================

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id)
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(cart_id, product_id)
);

-- =====================================================
-- ORDERS
-- =====================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  
  status order_status DEFAULT 'PLACED' NOT NULL,
  
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  
  payment_method TEXT DEFAULT 'cash_on_delivery',
  payment_status TEXT DEFAULT 'pending',
  
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  product_name TEXT NOT NULL,
  product_image TEXT,
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- ADDRESSES (for saved customer addresses)
-- =====================================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  label TEXT DEFAULT 'المنزل',
  address TEXT NOT NULL,
  district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
  phone TEXT,
  
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES for better performance
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- Regions & Districts
CREATE INDEX idx_districts_region ON districts(region_id);

-- Categories
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Shops
CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_region ON shops(region_id);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_slug ON shops(slug);

-- Products
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_slug ON products(shop_id, slug);

-- Carts
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- Addresses
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- =====================================================
-- Full Text Search (Arabic support)
-- =====================================================

-- Product search
ALTER TABLE products ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Shop search
ALTER TABLE shops ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_shops_search ON shops USING GIN(search_vector);

