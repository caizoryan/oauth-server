export async function getChannel(id, token) {
  const res = await fetch(`https://api.are.na/v3/channels/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return res.json();
}

export async function getChannelContents(id, token) {
  const res = await fetch(`https://api.are.na/v3/channels/${id}/contents?per=100`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return res.json();
}
