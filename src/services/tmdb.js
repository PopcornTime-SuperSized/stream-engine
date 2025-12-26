import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fallback API key for production builds (free TMDB API key)
const FALLBACK_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MjM0NjE1NjQxYzY0MzE1NWI5ZTMxOGE1MDEzMTdjNCIsIm5iZiI6MTc0ODM1MzgwMC40Miwic3ViIjoiNjgzNTM0MjhmNzM1NWUxMjVmYWFhODY0Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.xKVr4nuVv2lAb8xjxSP-0P7xMXp9PQ6gMbJAHnaHhh8';

const API_KEY = process.env.REACT_APP_TMDB_API_KEY || '7234615641c643155b9e318a501317c4';
const ACCESS_TOKEN = process.env.REACT_APP_TMDB_ACCESS_TOKEN || FALLBACK_API_KEY;

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  params: {
    api_key: API_KEY, // Some endpoints might still fallback to api_key query param
  },
});

export const tmdb = {
  // Movies
  getPopularMovies: async (page = 1) => {
    const response = await tmdbClient.get('/movie/popular', { params: { page } });
    return response.data;
  },
  searchMovies: async (query, page = 1) => {
    const response = await tmdbClient.get('/search/movie', { params: { query, page } });
    return response.data;
  },
  getMovieDetails: async (id) => {
    const response = await tmdbClient.get(`/movie/${id}`);
    return response.data;
  },

  // TV Shows
  getPopularTV: async (page = 1) => {
    const response = await tmdbClient.get('/tv/popular', { params: { page } });
    return response.data;
  },
  searchTV: async (query, page = 1) => {
    const response = await tmdbClient.get('/search/tv', { params: { query, page } });
    return response.data;
  },
  getTVDetails: async (id) => {
    const response = await tmdbClient.get(`/tv/${id}`);
    return response.data;
  },
  getTVSeason: async (tvId, seasonNumber) => {
    const response = await tmdbClient.get(`/tv/${tvId}/season/${seasonNumber}`);
    return response.data;
  },
  
  // Discovery with Sorting
  discoverMovies: async (sortBy = 'popularity.desc', page = 1) => {
    const response = await tmdbClient.get('/discover/movie', { 
      params: { 
        sort_by: sortBy,
        page 
      } 
    });
    return response.data;
  },
  discoverTV: async (sortBy = 'popularity.desc', page = 1) => {
    const response = await tmdbClient.get('/discover/tv', { 
      params: { 
        sort_by: sortBy,
        page 
      } 
    });
    return response.data;
  },

  // Images
  getImageUrl: (path, size = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
};
