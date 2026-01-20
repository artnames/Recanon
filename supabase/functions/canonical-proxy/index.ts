import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting (naive implementation for demo)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function getClientIP(req: Request): string {
  // Try various headers that might contain the client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  // Fallback to a generic identifier
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetIn: record.resetTime - now };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000); // Clean every minute

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/canonical-proxy', '');

  // Get the canonical renderer URL from secrets
  const CANONICAL_RENDERER_URL = Deno.env.get('CANONICAL_RENDERER_URL');
  
  if (!CANONICAL_RENDERER_URL) {
    console.error('[canonical-proxy] CANONICAL_RENDERER_URL secret not configured');
    return new Response(
      JSON.stringify({ error: 'Proxy not configured: missing CANONICAL_RENDERER_URL secret' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);
  
  if (!rateCheck.allowed) {
    console.warn(`[canonical-proxy] Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${Math.ceil(rateCheck.resetIn / 1000)} seconds before retrying.`,
        retryAfter: Math.ceil(rateCheck.resetIn / 1000)
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000))
        } 
      }
    );
  }

  // Route handling
  let targetPath: string;
  let method = req.method;
  let body: string | null = null;

  if (path === '/health' || path === '' || path === '/') {
    targetPath = '/health';
    method = 'GET';
  } else if (path === '/render') {
    if (method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', message: 'POST required for /render' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    targetPath = '/render';
    body = await req.text();
  } else if (path === '/verify') {
    if (method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', message: 'POST required for /verify' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    targetPath = '/verify';
    body = await req.text();
  } else {
    return new Response(
      JSON.stringify({ error: 'Not found', message: `Unknown endpoint: ${path}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Proxy the request
  const targetUrl = `${CANONICAL_RENDERER_URL}${targetPath}`;
  console.log(`[canonical-proxy] Proxying ${method} ${path} -> ${targetUrl}`);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      fetchOptions.body = body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[canonical-proxy] Upstream error: ${response.status} - ${errorText}`);
      
      // Return 502 for upstream errors
      if (response.status >= 500) {
        return new Response(
          JSON.stringify({ 
            error: 'Bad Gateway', 
            message: 'Canonical renderer returned an error',
            upstreamStatus: response.status,
            details: errorText.substring(0, 500) // Limit error text length
          }),
          { 
            status: 502, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': String(rateCheck.remaining)
            } 
          }
        );
      }

      // Forward client errors as-is
      return new Response(
        errorText,
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining)
          } 
        }
      );
    }

    const data = await response.text();
    console.log(`[canonical-proxy] Success: ${method} ${path}`);

    return new Response(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
        'X-Proxy': 'canonical-proxy'
      },
    });

  } catch (error) {
    console.error(`[canonical-proxy] Fetch error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Bad Gateway', 
        message: 'Failed to reach canonical renderer',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 502, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining)
        } 
      }
    );
  }
});
