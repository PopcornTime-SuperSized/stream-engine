import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.REACT_APP_TMDB_API_KEY;
const ACCESS_TOKEN = process.env.REACT_APP_TMDB_ACCESS_TOKEN;

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
