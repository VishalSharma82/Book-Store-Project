const axios = require("axios");

async function searchGoogleBooks(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url);

  if (!response.data.items) return [];

  return response.data.items.map(item => {
    const info = item.volumeInfo;
    return {
      title: info.title || "No Title",
      authors: info.authors?.join(", ") || "Unknown",
      description: info.description || "",
      thumbnail: info.imageLinks?.thumbnail || "",
      publishedDate: info.publishedDate || ""
    };
  });
}

module.exports = { searchGoogleBooks };
