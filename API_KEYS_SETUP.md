# 🔑 API Keys Setup Guide

## ✅ Mapbox API Key - CONFIGURED

Your Mapbox API key has been added to the `.env` file:
```
MAPBOX_API_KEY=pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g
```

## 📋 Other API Keys (Optional)

### OpenAI API Key (for AI Resume Parsing)
To enable AI-powered resume parsing, add to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
```
Get your key at: https://platform.openai.com/api-keys

### Google Maps API Key (for Mapping Features)
For advanced mapping features, add to `.env`:
```
GOOGLE_MAPS_API_KEY=your-google-maps-key-here
```
Get your key at: https://console.cloud.google.com/google/maps-apis

## 🔄 Restart Servers After Adding Keys

After adding API keys to `.env`:

1. **Stop the servers** (Ctrl+C in both windows)
2. **Restart them** to load the new environment variables

Or the servers will pick up changes on next restart.

## 📝 Current .env Location

The `.env` file is located at:
```
C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\.env
```

## 🔒 Security Note

- ✅ `.env` is in `.gitignore` (won't be committed to Git)
- ✅ Never share your API keys publicly
- ✅ Keep your `.env` file secure

---

**Your Mapbox key is configured and ready to use!**


