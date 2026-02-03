import { View } from 'react-native';
import FeedHeader from '../components/feed/FeedHeader';
import SavedMarketsFeed from '../components/feed/SavedMarketsFeed';
import MarketDetailModal from '../components/marketDetail/MarketDetailModal';
import { useSnackbar } from '../context/SnackbarContext';

function FeedScreen() {
  const showSnackbar = useSnackbar();

  return (
    <View className="flex-1 relative bg-tertiary">
      <View className="flex-1 pt-20">
        <FeedHeader />
        <SavedMarketsFeed onShowSnackbar={showSnackbar} />
        <MarketDetailModal />
      </View>
    </View>
  );
}

export default FeedScreen;
