# Supabase Storage Setup Guide

## ✅ Integration Complete!

All image upload handlers have been updated to use Supabase Storage instead of local file storage.

## 📋 Setup Steps

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (secret key - keep this safe!)

### 2. Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Name: `uploads`
4. **Public bucket**: ✅ Enable (so images are publicly accessible)
5. Click **"Create bucket"**

### 3. Set Up Bucket Policies (Optional but Recommended)

1. Go to **Storage** → **Policies** for the `uploads` bucket
2. Add policies for:
   - **INSERT**: Allow authenticated users to upload
   - **SELECT**: Allow public to read (for public images)
   - **UPDATE**: Allow authenticated users to update
   - **DELETE**: Allow authenticated users to delete

Or use this SQL in Supabase SQL Editor:

```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
```

### 4. Add Environment Variables to Railway

1. Go to Railway Dashboard → Your Service → **Variables**
2. Add these environment variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** Use the **Service Role Key**, not the anon key. The service role key has full access and is needed for server-side uploads.

### 5. Test the Integration

After deploying, test an image upload:

```bash
# Test restaurant logo upload
curl -X POST https://hatod-app-production.up.railway.app/api/restaurants/{restaurantId}/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/image.jpg"
```

## 📁 File Structure in Supabase Storage

Images will be organized in the `uploads` bucket as:
- `logos/restaurant-{timestamp}-{random}.jpg`
- `banners/banner-{timestamp}-{random}.jpg`
- `menu-items/menu-item-{timestamp}-{random}.jpg`
- `profiles/customer-{timestamp}-{random}.jpg`
- `profiles/rider-{timestamp}-{random}.jpg`
- `profiles/admin-{timestamp}-{random}.jpg`
- `payment/qr-code-{timestamp}-{random}.jpg`

## 🔒 Security Notes

1. **Service Role Key**: Keep this secret! Never commit it to git.
2. **Bucket Policies**: Configure appropriate access policies based on your needs.
3. **File Validation**: The code already validates:
   - File type (images only)
   - File size (5MB limit for most, 2MB for QR codes)

## 🐛 Troubleshooting

### Error: "Supabase Storage is not configured"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Railway
- Verify the values are correct (no extra spaces)

### Error: "Failed to upload file"
- Check that the `uploads` bucket exists in Supabase
- Verify the bucket is set to **Public**
- Check bucket policies allow uploads

### Images not loading
- Verify bucket is **Public**
- Check that the URL returned is accessible
- Verify CORS settings if accessing from web frontend

## ✅ What Changed

- ✅ All upload handlers now use Supabase Storage
- ✅ Images are stored persistently (survive deployments)
- ✅ Images are served via Supabase CDN (fast delivery)
- ✅ No more local file storage needed
- ✅ Backward compatible - existing `/uploads/` URLs will still work if you keep serving them

## 🚀 Next Steps

1. Set up Supabase Storage bucket
2. Add environment variables to Railway
3. Deploy and test
4. (Optional) Remove local `uploads/` directory if no longer needed

Your images are now stored in the cloud! 🎉

