// Supabase Edge Function to refresh Spotify access tokens
// This function handles token refresh server-side using the client secret

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get and verify the JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

    // Use getClaims instead of getUser
    const { data, error } = await supabaseClient.auth.getClaims(token)
    const userId = data?.claims?.sub

    if (!userId || error) {
      console.error('Auth error:', error)
      return new Response(
        JSON.stringify({ error: error?.message || 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Get the refresh token from the request body
    const { refresh_token } = await req.json()

    if (!refresh_token) {
      throw new Error('Missing refresh_token in request body')
    }

    // Get Spotify credentials from environment
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!spotifyClientId || !spotifyClientSecret) {
      throw new Error('Missing Spotify credentials in environment')
    }

    // Call Spotify's token refresh endpoint
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Spotify token refresh failed:', errorData)
      throw new Error(`Spotify API error: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()

    // Return the new tokens
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token, // Spotify may return a new refresh token
        expires_in: tokenData.expires_in,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in refresh-spotify-token function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
