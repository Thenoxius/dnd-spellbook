# Deployment Guide

This guide will help you deploy the D&D Spellbook application using GitHub Actions and Vercel.

## Prerequisites

1. A Supabase project (already set up)
2. A Vercel account
3. A GitHub account with the repository

## Step 1: Set up Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
6. Deploy the project

## Step 2: Get Vercel Credentials

After deploying, you'll need to get your Vercel credentials for GitHub Actions:

1. Go to Vercel → Settings → Tokens
2. Create a new token with "Full Account" scope
3. Copy the token (this is your `VERCEL_TOKEN`)

4. Go to your Vercel project → Settings → General
5. Copy the Project ID (this is your `VERCEL_PROJECT_ID`)

6. Go to Vercel → Settings → General
7. Copy the Organization ID (this is your `VERCEL_ORG_ID`)

## Step 3: Configure GitHub Secrets

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `VERCEL_TOKEN`: Your Vercel token from Step 2
   - `VERCEL_ORG_ID`: Your Vercel organization ID from Step 2
   - `VERCEL_PROJECT_ID`: Your Vercel project ID from Step 2

## Step 4: Enable GitHub Actions

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`. It will:
- Automatically deploy to Vercel when you push to `main` or `master` branch
- Run on pull requests to `main` or `master` branch
- Build the application with the correct environment variables

## Step 5: Test the Deployment

1. Push your changes to the `main` branch
2. Go to the "Actions" tab in your GitHub repository
3. Watch the deployment workflow run
4. Once complete, visit your Vercel URL to test the application

## Accessing the App

After successful deployment, you can:
- Share the Vercel URL with friends
- Access it from mobile devices
- Test the application on different devices

## Troubleshooting

**Build fails:**
- Check that all environment variables are set correctly in GitHub Secrets
- Verify that the build command works locally: `npm run build`

**Authentication issues:**
- Ensure Supabase Auth is enabled in your Supabase dashboard
- Check that the RLS policies are applied correctly

**Theme not loading:**
- Verify that the user_profiles table exists
- Check that the trigger is working for new user signups
