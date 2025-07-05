# Partner Connection Setup Instructions

## Overview
This implementation adds partner connection functionality to your couple app with the following features:
- Unique connection codes for each user
- Real-time partner mood synchronization
- Shared daily quotes
- Partner nudge notifications
- Background changes based on partner's mood

## Database Setup

### 1. Run the SQL Schema
Copy and paste the contents of `schema.sql` into your Supabase SQL editor and run it. This will create:
- `user_profiles` table for user data and partner connections
- `daily_quotes` table for storing daily quotes
- `connection_requests` table for managing connection requests
- Row Level Security (RLS) policies
- Helper functions for connection codes and partner management

### 2. Enable Row Level Security
The schema automatically enables RLS on all tables. Make sure your Supabase project has RLS enabled in the Authentication settings.

### 3. Set up Authentication
Ensure Clerk is properly configured with your Supabase project. The app uses Clerk for authentication and stores the Clerk user ID in the `user_profiles` table.

## Environment Variables
Make sure you have these environment variables set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Features Implemented

### 1. Partner Connection
- Each user gets a unique 6-character connection code
- Users can share their code with their partner
- Partners can connect by entering each other's codes
- Connection status is displayed on the home screen

### 2. Real-time Mood Sync
- When connected, the app background changes based on the partner's mood
- Mood changes are synchronized in real-time using Supabase subscriptions
- Both users see the same background when connected

### 3. Daily Quotes
- Users can set a daily quote/line of the day
- When connected, both users can see each other's quotes
- Quotes are stored in the database and sync in real-time

### 4. Partner Nudges
- Heart button sends real-time nudges to the connected partner
- Nudges trigger notifications and device vibration
- Uses Supabase real-time channels for instant delivery

### 5. Connection Management
- Users can view their connection status
- Disconnect functionality to remove partner connection
- Connection modal for managing partner relationships

## How It Works

### Connection Flow
1. User signs up and gets a unique connection code
2. User shares their code with their partner
3. Partner enters the code in their app
4. Both users are now connected and can see each other's data

### Real-time Updates
- Uses Supabase real-time subscriptions to sync data
- Partner mood changes update the background immediately
- Daily quotes sync when either partner updates them
- Nudges are sent through real-time channels

### Data Flow
1. User actions (mood change, quote update, nudge) are sent to Supabase
2. Supabase triggers real-time updates to connected clients
3. Partner's app receives updates and updates the UI accordingly

## Testing the Implementation

### 1. Test Connection
- Sign up with two different accounts
- Share connection codes between the accounts
- Verify that connection status updates

### 2. Test Mood Sync
- Change mood on one account
- Verify that the other account's background changes
- Check that mood changes are reflected in real-time

### 3. Test Daily Quotes
- Set a daily quote on one account
- Verify that the partner can see the quote
- Test quote updates in real-time

### 4. Test Nudges
- Send a nudge from one account
- Verify that the partner receives the notification
- Check that device vibration works (on supported devices)

## Troubleshooting

### Common Issues

1. **Connection not working**
   - Check that RLS policies are properly set up
   - Verify that the connection code function is working
   - Check browser console for errors

2. **Real-time updates not working**
   - Ensure Supabase real-time is enabled
   - Check that channels are properly subscribed
   - Verify that the user is authenticated

3. **Database errors**
   - Check that all tables are created properly
   - Verify that RLS policies allow the necessary operations
   - Check that the user has the correct permissions

### Debug Steps
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify that environment variables are set correctly
4. Test with a fresh user account to isolate issues

## Security Considerations

- All database operations are protected by RLS policies
- Users can only access their own data and their partner's data
- Connection codes are unique and randomly generated
- Real-time channels are scoped to individual users

## Performance Notes

- Real-time subscriptions are automatically cleaned up when components unmount
- Database queries are optimized with proper indexes
- Connection codes are generated efficiently with collision detection
- UI updates are debounced to prevent excessive re-renders 