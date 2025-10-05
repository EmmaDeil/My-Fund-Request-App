# Render Configuration for React Frontend with BrowserRouter

## Build Settings in Render Dashboard

### For Static Site:
**Build Command:**
```
npm install && npm run build && cp public/_redirects build/_redirects
```

**Publish Directory:**
```
build
```

### For Web Service (if using Node server):
**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npx serve -s build -l $PORT
```

---

## Important: Verify `_redirects` file

The file `public/_redirects` should contain:
```
/*    /index.html   200
```

This tells Render to serve `index.html` for all routes, allowing React Router to handle client-side routing.

---

## Alternative: Use serve with rewrites

If above doesn't work, install serve:

1. Add to package.json dependencies:
```json
"serve": "^14.2.0"
```

2. Update build command in Render:
```
npm install && npm run build
```

3. Update start command in Render:
```
npx serve -s build -l $PORT
```

The `-s` flag enables single-page application mode with proper routing.

---

## Troubleshooting 404 on /approve

If you still get 404:

1. Check Render build logs - ensure `_redirects` is being copied
2. Verify "Publish Directory" is set to `build`
3. Try manual redeploy with cache cleared
4. Check browser console for routing errors
