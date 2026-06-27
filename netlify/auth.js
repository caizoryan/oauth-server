const CLIENT_ID = "7LdAwx2v-bKI_h8wbP0L2O-eFja3VujgHIHPk5S8-wY";
const CLIENT_SECRET = "1303c7003860c62005a0a6c93d323555b9df40e6b7820f50b3a68e7426a15aa0";
const REDIRECT_URI = "https://kaleidoscopic-druid-9d3ee7.netlify.app/.netlify/functions/auth";
const CLIENT_URL = "http://localhost:7222"

const AUTHORIZATION_URL = "https://www.are.na/oauth/authorize";
const TOKEN_URL = "https://api.are.na/v3/oauth/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  const { code, action, scope } = event.queryStringParameters || {};
  const scopeValue = scope || "read";

	if (action == 'error') {
    return ReturnToken("DENIED");
	}

  if (action === "auth") {
		let authUrl = new URL(AUTHORIZATION_URL)
		let params = new URLSearchParams({
				client_id: CLIENT_ID,
				redirect_uri: REDIRECT_URI,
				response_type: 'code',
				scope: scopeValue
			})

	  authUrl = authUrl + '?' + params;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ authorization_url: authUrl.toString() }),
		};
  }

  if (code) {
    try {
      const tokenResponse = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return {
          statusCode: tokenResponse.status,
          headers: corsHeaders,
          body: `Token exchange failed: ${tokenResponse.status} - ${errorText}`,
        };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      return ReturnToken(accessToken);
    } catch (error) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: `OAuth token exchange failed: ${error.message}`,
      };
    }
  }

  return BasePage;
}

let ReturnToken = (token) => {
      const link = `${CLIENT_URL}/?token=${token}`;
return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
        },
        body: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Redirector</title>
  </head>
  <body>
  </body>
  <script>
  window.location.href = "${link}";
  </script>
</html>
`,
      }
}

let BasePage = {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html",
    },
    body: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Are.na OAuth</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
    <h1>Are.na OAuth Flow</h1>
    <p>This server handles OAuth authentication for Are.na.</p>
    
    <h2>To start the OAuth flow:</h2>
    <ol>
      <li>Visit: <a href="?action=auth&scope=read">?action=auth&scope=read</a> for read access</li>
      <li>Or visit: <a href="?action=auth&scope=write">?action=auth&scope=write</a> for read/write access</li>
      <li>You'll be redirected to Are.na to authorize</li>
      <li>After authorization, you'll be redirected back here with a code</li>
      <li>The code will be exchanged for an access token</li>
    </ol>
    
    <h2>Or use this authorization URL directly:</h2>
    <pre>${AUTHORIZATION_URL}?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=read</pre>
    
    <h2>Endpoints:</h2>
    <ul>
      <li><strong>Authorization URL:</strong> ${AUTHORIZATION_URL}</li>
      <li><strong>Token URL:</strong> ${TOKEN_URL}</li>
      <li><strong>Redirect URI:</strong> ${REDIRECT_URI}</li>
    </ul>
  </body>
</html>
`,
  }
