-- supabase/migrations/20260601000001_add_category_color.sql
-- Add color column to categories to enable custom color selection for each category.

alter table public.categories 
  add column if not exists color text;
