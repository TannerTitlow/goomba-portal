// Supabase Edge Function to refresh Spotify access tokens
// This function handles token refresh server-side using the client secret

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client to verify the user's session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
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
