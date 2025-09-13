export const fetchPlaylistFromProxy = async (baseUrl, username, password) => {
  if (!baseUrl || !username || !password) {
    throw new Error('Missing required credentials');
  }

  const url = `http://localhost:8081/get?base_url=${encodeURIComponent(baseUrl)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  
  console.log('🔍 Fetching from proxy:', {
    baseUrl: baseUrl.substring(0, 20) + '...',
    username: username,
    url: url.substring(0, 50) + '...'
  });
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Proxy response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Proxy error response:', errorText);
      throw new Error(`Proxy error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const text = await response.text();
    console.log('📄 Response size:', text.length, 'characters');
    console.log('📄 Response preview:', text.substring(0, 200) + '...');

    // Create a new response with the text
    const newResponse = new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    return newResponse;
  } catch (error) {
    console.error('❌ Proxy fetch error:', error);
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error('Request timeout - proxy server did not respond in time');
    }
    throw error;
  }
};