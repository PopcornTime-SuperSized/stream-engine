// Banner Configuration
// Toggle between 'local' and 'external' banner sources

const BANNER_SOURCE = 'external'; // Options: 'local' | 'external'

const bannerConfig = {
  local: {
    column1: '/banners/column_1.html',
    column2: '/banners/column_2.html'
  },
  external: {
    column1: 'https://nsdb.com/streamengine/banners/column_1.html',
    column2: 'https://nsdb.com/streamengine/banners/column_2.html'
  }
};

// Get current banner URLs based on source setting
export const getBannerUrls = () => {
  return bannerConfig[BANNER_SOURCE] || bannerConfig.local;
};

// Export the source setting for reference
export const getBannerSource = () => BANNER_SOURCE;

// Quick toggle function (for future UI toggle implementation)
export const isExternalBanners = () => BANNER_SOURCE === 'external';

export default bannerConfig;
