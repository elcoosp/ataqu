export const buildQueryString = (params: Record<string,any>) => {
  const search = new URLSearchParams();
  for (const [key,val] of Object.entries(params)) {
    if (val !== undefined && val !== null) search.append(key, String(val));
  }
  const s = search.toString();
  return s ? '?'+s : '';
};
