export async function createBlock({
	value,
	title,
	description,
	metadata,
	channel_id}, token) {
  const body = { value, channel_ids: [channel_id] };
  if (title) body.title = title;
  if (description) body.description = description;
  if (metadata) body.metadata = metadata;

  const res = await fetch('https://api.are.na/v3/blocks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return res.json();
}
