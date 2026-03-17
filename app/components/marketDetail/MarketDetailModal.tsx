import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '../../context/SearchContext';
import {
  getMarketDetails,
  getMarketComments,
  addMarketComment,
  deleteMarketComment,
  Comment,
} from '../../services/marketDetailsService';
import { getPhotoUrl } from '../../utils/photoUtils';
import { getWeeklySchedule } from '../../utils/weeklySchedule';
import { isMarketSaved, toggleSaveMarket } from '../../services/savedMarketService';
import MarketDetailHeader from './header/MarketDetailHeader';
import MarketPhoto from './sections/MarketPhoto';
import MarketNameCard from './sections/MarketNameCard';
import MarketLocation from './sections/MarketLocation';
import MarketWebsite from './sections/MarketWebsite';
import MarketSchedule from './sections/MarketSchedule';
import MarketReactions from './reactions/MarketReactions';
import CommentsSection from './comments/CommentsSection';

function MarketDetailModal() {
  const { selectedMarket, setSelectedMarket, refreshSavedMarkets } = useSearch();
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [lastCommentId, setLastCommentId] = useState<string | undefined>();
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [savedStatusPlaceId, setSavedStatusPlaceId] = useState<string | null>(null);
  const [savingSavedState, setSavingSavedState] = useState(false);
  const insets = useSafeAreaInsets();
  const detailsScrollRef = useRef<ScrollView>(null);

  const scrollCommentsIntoView = useCallback((opts?: { animated?: boolean }) => {
    const animated = opts?.animated ?? true;
    requestAnimationFrame(() => {
      detailsScrollRef.current?.scrollToEnd({ animated });
      requestAnimationFrame(() => {
        detailsScrollRef.current?.scrollToEnd({ animated });
      });
      if (Platform.OS === 'ios') {
        setTimeout(() => {
          detailsScrollRef.current?.scrollToEnd({ animated });
        }, 120);
      }
    });
  }, []);

  const loadMarketDetails = async () => {
    if (!selectedMarket) return;
    setLoading(true);
    try {
      await getMarketDetails(selectedMarket.place_id);
    } catch (error) {
      console.error('Error loading market details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (reset: boolean = false) => {
    if (!selectedMarket) return;
    setLoadingComments(true);
    try {
      const newComments = await getMarketComments(
        selectedMarket.place_id,
        20,
        reset ? undefined : lastCommentId,
      );
      if (reset) {
        setComments(newComments);
      } else {
        setComments(prev => [...prev, ...newComments]);
      }
      if (newComments.length > 0) {
        const lastComment = newComments[newComments.length - 1];
        setLastCommentId(lastComment.id || lastComment.userId || undefined);
      }
      setHasMoreComments(newComments.length === 20);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (selectedMarket) {
      loadMarketDetails();
      loadComments(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket]);

  useEffect(() => {
    if (!showCommentInput) return;
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(eventName, () => {
      scrollCommentsIntoView({ animated: true });
    });
    return () => sub.remove();
  }, [showCommentInput, scrollCommentsIntoView]);

  useEffect(() => {
    if (!selectedMarket?.place_id) return;
    let cancelled = false;
    const placeId = selectedMarket.place_id;
    setCheckingSaved(true);
    setSavedStatusPlaceId(null);

    (async () => {
      try {
        const saved = await isMarketSaved(placeId);
        if (cancelled) return;
        setIsSaved(saved);
        setSavedStatusPlaceId(placeId);
      } catch (error) {
        console.error('Error checking saved status:', error);
        if (cancelled) return;
        setIsSaved(false);
        setSavedStatusPlaceId(placeId);
      } finally {
        if (!cancelled) setCheckingSaved(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedMarket?.place_id]);

  const handleAddComment = async (commentText: string) => {
    if (!selectedMarket) return;
    setSubmittingComment(true);
    try {
      await addMarketComment(selectedMarket.place_id, commentText);
      setShowCommentInput(false);
      await loadComments(true);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string | undefined) => {
    if (!selectedMarket || !commentId) return;
    try {
      const success = await deleteMarketComment(selectedMarket.place_id, commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId && c.userId !== commentId));
      } else {
        Alert.alert('Error', 'Failed to delete comment. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!selectedMarket || checkingSaved || savingSavedState) return;
    if (savedStatusPlaceId !== selectedMarket.place_id) return;
    const previousSavedState = isSaved;
    try {
      setSavingSavedState(true);
      setIsSaved(!previousSavedState);
      await toggleSaveMarket(selectedMarket.place_id);
      await refreshSavedMarkets();
    } catch (error) {
      console.error('Error toggling save:', error);
      setIsSaved(previousSavedState);
      Alert.alert('Error', 'Failed to save market. Please try again.');
    } finally {
      setSavingSavedState(false);
    }
  };

  const openGoogleMapsReviews = () => {
    if (!selectedMarket?.name) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMarket.name)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps'));
  };

  const openGoogleMapsDirections = () => {
    if (!selectedMarket?.name) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedMarket.name)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps'));
  };

  const handleToggleCommentInput = () => {
    const next = !showCommentInput;
    setShowCommentInput(next);
    if (next) scrollCommentsIntoView();
  };

  if (!selectedMarket) return null;

  const marketWithDetails = selectedMarket as any;
  const photoReference = marketWithDetails?.photos?.[0]?.photo_reference || marketWithDetails?.photo_reference;
  const photoUrl = getPhotoUrl(photoReference, marketWithDetails?.photo_storage_url, 800);

  const weeklySchedule = getWeeklySchedule(marketWithDetails?.opening_hours?.periods).filter(
    day => day.isOpen && day.openTime && day.closeTime && day.openTime !== '-' && day.closeTime !== '-',
  );

  const saveButtonLoading = checkingSaved || savedStatusPlaceId !== selectedMarket.place_id || savingSavedState;

  return (
    <Modal
      visible={!!selectedMarket}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setSelectedMarket(null)}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <MarketDetailHeader
            onSave={handleSave}
            onClose={() => setSelectedMarket(null)}
            isSaved={isSaved}
            loading={saveButtonLoading}
          />

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#FF8A65" />
            </View>
          ) : (
            <View className="flex-1">
              <ScrollView
                ref={detailsScrollRef}
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <MarketPhoto photoUrl={photoUrl} />
                <MarketNameCard
                  name={selectedMarket.name}
                  rating={marketWithDetails?.rating}
                  userRatingsTotal={marketWithDetails?.user_ratings_total}
                  onOpenGoogleMapsReviews={openGoogleMapsReviews}
                />
                {marketWithDetails?.formatted_address && (
                  <MarketLocation
                    formattedAddress={marketWithDetails.formatted_address}
                    onOpenDirections={openGoogleMapsDirections}
                  />
                )}
                {marketWithDetails?.website && (
                  <MarketWebsite website={marketWithDetails.website} />
                )}
                <MarketSchedule weeklySchedule={weeklySchedule} />
                <MarketReactions placeId={selectedMarket.place_id} />
                <CommentsSection
                  comments={comments}
                  loadingComments={loadingComments}
                  submittingComment={submittingComment}
                  showCommentInput={showCommentInput}
                  placeId={selectedMarket.place_id}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onToggleCommentInput={handleToggleCommentInput}
                  onLoadMore={() => { if (!loadingComments && hasMoreComments) loadComments(false); }}
                  onFocusInput={() => scrollCommentsIntoView()}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default MarketDetailModal;
