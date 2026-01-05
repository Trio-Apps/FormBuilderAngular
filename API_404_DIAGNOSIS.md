# API 404 Error Diagnosis & Fix

## Changes Made

### 1. Enhanced `users.service.ts`
- ✅ Added `StorageService` injection to check token availability
- ✅ Added comprehensive debug logging for all API calls
- ✅ Enhanced error logging with detailed error information (status, URL, message)
- ✅ Added token existence checks before making requests

### 2. Enhanced `auth.interceptor.ts`
- ✅ Added debug logging for all requests
- ✅ Logs token existence and preview
- ✅ Enhanced error logging for 401 and 404 errors
- ✅ Added warning for requests without tokens to protected endpoints

## Debugging Steps

### Step 1: Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab. You should now see detailed logs like:

```
[AuthInterceptor] Request URL: https://localhost:7276/api/Users/active
[AuthInterceptor] Token exists: true/false
[AuthInterceptor] Token preview: eyJhbGciOiJIUzI1NiIs...
[UsersService] getActiveUsers - URL: https://localhost:7276/api/Users/active
[UsersService] getActiveUsers - Token exists: true/false
```

### Step 2: Check Network Tab
1. Open Developer Tools → Network tab
2. Filter by "Fetch/XHR"
3. Look for requests to `/api/Users/active` or `/api/UserGroups/active`
4. Click on the failed request
5. Check:
   - **Request Headers**: Look for `Authorization: Bearer <token>`
   - **Response Status**: Should be 404 or 401
   - **Response Body**: May contain error details

### Step 3: Verify Token Exists
In the browser console, run:
```javascript
// Check if token exists
console.log('Token:', sessionStorage.getItem('auth_token'));

// Check if user is logged in
console.log('Username:', sessionStorage.getItem('user_name'));
console.log('Role:', sessionStorage.getItem('user_role'));
```

### Step 4: Test API Directly
Open Swagger UI at `https://localhost:7276/swagger`:
1. Click "Authorize" button
2. Enter your JWT token (format: `Bearer <your-token>`)
3. Test endpoints:
   - `GET /api/Users/active`
   - `GET /api/UserGroups/active`

### Step 5: Check API Server Logs
Look at your API server console/logs for:
- Authentication failures
- Routing errors
- Controller discovery issues

## Expected Behavior

### ✅ With Valid Token:
- Console shows: `[AuthInterceptor] Token exists: true`
- Network tab shows: `Authorization: Bearer <token>` header
- API returns: **200 OK** with data

### ❌ Without Token:
- Console shows: `[AuthInterceptor] Token exists: false`
- Console shows: `[AuthInterceptor] Request without token: <url>`
- Network tab: No `Authorization` header
- API should return: **401 Unauthorized** (NOT 404)

### ❌ With Invalid/Expired Token:
- Console shows: `[AuthInterceptor] Token exists: true`
- Network tab shows: `Authorization: Bearer <token>` header
- API should return: **401 Unauthorized** (NOT 404)

### ❌ If Route Doesn't Exist:
- API returns: **404 Not Found**
- This suggests:
  - API server not running
  - Route not registered
  - Controller not discovered

## Common Issues & Solutions

### Issue 1: Token Not Being Sent
**Symptoms**: Console shows `Token exists: false`
**Solution**: 
- Ensure user is logged in
- Check `StorageService` is working correctly
- Verify token is stored in `sessionStorage` with key `auth_token`

### Issue 2: Token Format Incorrect
**Symptoms**: Token exists but API returns 401
**Solution**: 
- Verify token format is `Bearer <token>` (not just `<token>`)
- Check token hasn't expired
- Verify token is valid JWT format

### Issue 3: API Server Not Running
**Symptoms**: All requests return 404, Swagger UI not accessible
**Solution**: 
- Start the API server
- Verify it's running on `https://localhost:7276`
- Check firewall/network settings

### Issue 4: CORS Issues
**Symptoms**: Browser console shows CORS errors
**Solution**: 
- Check API CORS configuration
- Verify Angular app origin is allowed
- Check preflight OPTIONS requests

### Issue 5: Route Not Registered
**Symptoms**: 404 for specific endpoints only
**Solution**: 
- Verify controller is registered in `Program.cs`
- Check `app.MapControllers()` is called
- Verify controller route attributes

## Next Steps

1. **Run the application** and check browser console for debug logs
2. **Check Network tab** for request/response details
3. **Verify token exists** using browser console commands
4. **Test API directly** using Swagger UI
5. **Check API server logs** for errors

## Quick Test Commands

### In Browser Console:
```javascript
// Check authentication state
const token = sessionStorage.getItem('auth_token');
console.log('Token:', token ? 'Exists' : 'Missing');
console.log('Token Preview:', token ? token.substring(0, 20) + '...' : 'N/A');

// Check user info
console.log('Username:', sessionStorage.getItem('user_name'));
console.log('Role:', sessionStorage.getItem('user_role'));
```

### Test API Endpoint (in browser console):
```javascript
// Test with current token
const token = sessionStorage.getItem('auth_token');
fetch('https://localhost:7276/api/Users/active', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => console.log('Data:', data))
.catch(err => console.error('Error:', err));
```

## Files Modified

1. `src/app/views/FormBuilder/services/users.service.ts`
   - Added `StorageService` injection
   - Enhanced error logging
   - Added debug logging

2. `src/app/auth/auth.interceptor.ts`
   - Enhanced logging
   - Better error handling
   - Token validation logging

## Enable/Disable Debug Logging

Debug logging is controlled by `environment.config.enableDebug`. To disable:
- Set `enableDebug: false` in `src/app/environments/environment.ts`

