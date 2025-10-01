// Frontend configuration for connecting to your FPL Analyst API
// Add this to your Tempo.ai project

const API_BASE_URL = 'http://localhost:5000/api';

// API client functions
export const fplApi = {
  // Get all players
  getPlayers: async () => {
    const response = await fetch(`${API_BASE_URL}/players`);
    return response.json();
  },

  // Get players by position
  getPlayersByPosition: async (position) => {
    const response = await fetch(`${API_BASE_URL}/players/${position}`);
    return response.json();
  },

  // Get team rankings
  getTeams: async () => {
    const response = await fetch(`${API_BASE_URL}/teams`);
    return response.json();
  },

  // Get fixtures (optional gameweek filter)
  getFixtures: async (gameweek = null) => {
    const url = gameweek 
      ? `${API_BASE_URL}/fixtures?gw=${gameweek}`
      : `${API_BASE_URL}/fixtures`;
    const response = await fetch(url);
    return response.json();
  },

  // Get top performers
  getTopPerformers: async () => {
    const response = await fetch(`${API_BASE_URL}/top-performers`);
    return response.json();
  },

  // Get hidden gems
  getHiddenGems: async () => {
    const response = await fetch(`${API_BASE_URL}/hidden-gems`);
    return response.json();
  },

  // Get transfer recommendations
  getTransfers: async () => {
    const response = await fetch(`${API_BASE_URL}/transfers`);
    return response.json();
  },

  // Health check
  getHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  }
};

// Example usage in your React components:
/*
import { fplApi } from './fplApi';

// In your component
const [players, setPlayers] = useState([]);

useEffect(() => {
  fplApi.getPlayers().then(setPlayers);
}, []);
*/