# Sun Is Up - Energy Community Platform

## Environment Setup

### Supabase Configuration

1. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings > API
   - Copy the "Project URL" and "anon public" key

2. **Set environment variables:**

   **For local development:**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   **For production deployment:**
   - In your hosting platform (Netlify, Vercel, etc.)
   - Add the same environment variables in the deployment settings
   - Make sure they start with `VITE_` prefix

3. **Where these are used in the code:**
   - `src/lib/supabase.ts` - Main Supabase client configuration
   - The app automatically detects if these variables are missing

### Security Notes

- **NEVER** commit your `.env` file to git
- **NEVER** put credentials directly in the code
- The anon key is safe to expose in frontend code
- Use environment variables for all sensitive configuration

## Development

```bash
npm install
npm run dev
```

## Deployment

The app will automatically detect missing environment variables and show helpful error messages.