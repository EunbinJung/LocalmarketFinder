import { View } from 'react-native';
import FeedHeader from '../components/feed/FeedHeader';
import SavedMarketsFeed from '../components/feed/SavedMarketsFeed';
import MarketDetailModal from '../components/marketDetail/MarketDetailModal';
import { useTopSnackbar } from '../components/common/TopSnackbar';

function FeedScreen() {
  const { snackbar, showSnackbar } = useTopSnackbar();

  return (
    <View className="flex-1 relative bg-tertiary">
      {snackbar}
      <View className="flex-1 pt-20">
        <FeedHeader />
        <SavedMarketsFeed onShowSnackbar={showSnackbar} />
        <MarketDetailModal />
      </View>
    </View>
  );
}

export default FeedScreen;
