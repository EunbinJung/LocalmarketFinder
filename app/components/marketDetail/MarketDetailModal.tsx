import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  FlatList,
  Alert,
  Animated,
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
import ReactionField from './ReactionField';
import { auth } from '../../services/firebase';
import { isMarketSaved, toggleSaveMarket } from '../../services/savedMarketService';

// Comment Input Component
const CommentInputComponent = ({
  onSubmit,
  onCancel,
  loading,
  onFocusInput,
}: {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  loading: boolean;
  onFocusInput?: () => void;
}) => {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = () => {
    if (commentText.trim()) {
      onSubmit(commentText.trim());
      setCommentText('');
    }
  };

  return (
    <View className="p-4 bg-gray-50 border-t border-gray-200">
      <TextInput
        value={commentText}
        onChangeText={setCommentText}
        placeholder="Write an anonymous comment..."
        multiline
        className="bg-white border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px] mb-3"
        editable={!loading}
        onFocus={() => onFocusInput?.()}
      />
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !commentText.trim()}
          className="flex-1 bg-primary py-3 rounded-lg"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">
              Submit
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setCommentText('');
            onCancel();
          }}
          disabled={loading}
          className="flex-1 bg-gray-300 py-3 rounded-lg"
        >
          <Text className="text-gray-700 text-center font-semibold">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Comment Item Component
const CommentItem = ({
  comment,
  placeId: _placeId,
  onDelete,
}: {
  comment: Comment;
  placeId: string;
  onDelete: (commentId: string | undefined) => void;
}) => {
  // Direct client-side comparison: auth.currentUser?.uid === comment.userId
  const canDelete = auth.currentUser?.uid === comment.userId;

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id || comment.userId || undefined),
        },
      ],
    );
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Recently';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return 'Recently';
    } catch {
      return 'Recently';
    }
  };

  return (
    <View className="bg-tertiary p-4 rounded-2xl mb-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-base text-gray-800 flex-1 leading-6">{comment.text}</Text>
        {canDelete && (
          <TouchableOpacity 
            onPress={handleDelete}
            className="ml-2 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-lg">🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-500 font-medium">{formatDate(comment.createdAt)}</Text>
      </View>
    </View>
  );
};

function MarketDetailModal() {
  const { selectedMarket, setSelectedMarket, refreshSavedMarkets } = useSearch();
  const [_marketDetails, setMarketDetails] = useState<any>(null);
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
  const saveAnimation = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();
  const detailsScrollRef = useRef<ScrollView>(null);


  useEffect(() => {
    console.log('website:', selectedMarket?.website);
  }, [selectedMarket]);

  const scrollCommentsIntoView = useCallback((opts?: { animated?: boolean }) => {
    const animated = opts?.animated ?? true;
    // Let layout/keyboard settle, then scroll so the input isn't hidden.
    // (One frame is sometimes not enough on iOS; do a small retry.)
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
      const details = await getMarketDetails(selectedMarket.place_id);
      setMarketDetails(details);
    } catch (error) {
      console.error('Error loading market details:', error);
    } finally {
      setLoading(false);
    }
  };

   // Google Maps reviews link
   const openGoogleMapsReviews = () => {
    if (!selectedMarket?.name) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      selectedMarket.name,
    )}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  // Google Maps directions link
  const openGoogleMapsDirections = () => {
    if (!selectedMarket?.name) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      selectedMarket.name,
    )}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps');
    });
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

  // When the comment input is visible, ensure keyboard show doesn't cover it.
  useEffect(() => {
    if (!showCommentInput) return;
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(eventName, () => {
      scrollCommentsIntoView({ animated: true });
    });
    return () => {
      sub.remove();
    };
  }, [showCommentInput, scrollCommentsIntoView]);

  // Saved status can lag when switching markets quickly.
  // Track which placeId the current `isSaved` value belongs to and show a loader until it matches.
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

    return () => {
      cancelled = true;
    };
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

  const handleLoadMore = () => {
    if (!loadingComments && hasMoreComments) {
      loadComments(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMarket || checkingSaved || savingSavedState) return;
    // Prevent toggling while saved status is still resolving for the currently selected market
    if (savedStatusPlaceId !== selectedMarket.place_id) return;

    const previousSavedState = isSaved;
    
    try {
      setSavingSavedState(true);
      // Optimistic update
      setIsSaved(!previousSavedState);

      // Trigger animation
      Animated.sequence([
        Animated.timing(saveAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.delay(1000),
        Animated.timing(saveAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Toggle save in Firestore
      const saved = await toggleSaveMarket(selectedMarket.place_id);
      setIsSaved(saved);

      // Update global saved markets list
      await refreshSavedMarkets();
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revert optimistic update
      setIsSaved(previousSavedState);
      Alert.alert('Error', 'Failed to save market. Please try again.');
    } finally {
      setSavingSavedState(false);
    }
  };

  const marketWithDetails = selectedMarket as any;
  // Support both formats: photos array or direct photo_reference field
  const photoReference = marketWithDetails?.photos?.[0]?.photo_reference || marketWithDetails?.photo_reference;
  const photoUrl = getPhotoUrl(photoReference, marketWithDetails?.photo_storage_url, 800);

  const weeklySchedule = getWeeklySchedule(
    marketWithDetails?.opening_hours?.periods,
  ).filter(day => day.isOpen && day.openTime && day.closeTime && day.openTime !== '-' && day.closeTime !== '-');

  const saveButtonBackgroundColor = saveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#E69DB8'],
  });

  const saveButtonTextColor = saveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E69DB8', '#FFFFFF'],
  });

  if (!selectedMarket) return null;

  const isSavedStatusLoading =
    checkingSaved || savedStatusPlaceId !== selectedMarket.place_id;
  const saveButtonLoading = isSavedStatusLoading || savingSavedState;
  const saveButtonDisabled = saveButtonLoading;

  const saveButtonLabel = savingSavedState
    ? ''
    : isSavedStatusLoading
      ? ''
      : isSaved
        ? 'Saved'
        : 'Save';

  const saveButtonBaseStyle = (() => {
    if (saveButtonLoading) {
      return { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', textColor: '#6B7280' };
    }
    if (isSaved) {
      return { backgroundColor: '#E69DB8', borderColor: '#E69DB8', textColor: '#FFFFFF' };
    }
    return { backgroundColor: '#FFFFFF', borderColor: '#E69DB8', textColor: '#E69DB8' };
  })();

  const getWebsiteBadge = (url: string) => {
    const lower = url.toLowerCase();
  
    if (lower.includes('instagram.com')) {
      return { label: 'Instagram', emoji: '📸' };
    }
  
    if (lower.includes('facebook.com') || lower.includes('fb.com')) {
      return { label: 'Facebook', emoji: '📘' };
    }
  
    return { label: 'Website', emoji: '🔗' };
  };
  

  return (
    <Modal
      visible={!!selectedMarket}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setSelectedMarket(null)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {/* Sticky Header */}
          <View className="flex-row justify-between items-center px-5 py-5 bg-white" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 }}>
            <Text className="text-2xl font-bold text-gray-800">
              Market Details
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSave}
                disabled={saveButtonDisabled}
                activeOpacity={0.85}
                className="px-5 py-2.5 rounded-full"
                style={{
                  overflow: 'hidden',
                  backgroundColor: saveButtonBaseStyle.backgroundColor,
                  borderWidth: 2,
                  borderColor: saveButtonBaseStyle.borderColor,
                }}
              >
                {!saveButtonLoading && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: saveButtonBackgroundColor,
                    }}
                  />
                )}

                <View
                  className="flex-row items-center justify-center"
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  {saveButtonLoading ? (
                    <ActivityIndicator size="small" color={saveButtonBaseStyle.textColor} />
                  ) : (
                    <Animated.Text
                      className="font-semibold text-sm"
                      style={{
                        color: saveButtonTextColor,
                      }}
                    >
                      {saveButtonLabel}
                    </Animated.Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedMarket(null)}
                className="px-5 py-2.5 bg-tertiary rounded-full"
              >
                <Text className="text-gray-700 font-semibold text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                {/* Photo */}
                {photoUrl ? (
                  <View className="mt-5 mb-5 rounded-3xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
                    <Image
                      source={{ uri: photoUrl }}
                      className="w-full h-72"
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View className="mt-5 mb-5 w-full h-72 bg-secondary rounded-3xl justify-center items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
                    <Text className="text-primary text-lg font-semibold">Localmarket Finder</Text>
                  </View>
                )}

               {/* Market Name */}
               <View className="mb-5 pb-5 bg-tertiary rounded-3xl p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                  <Text className="text-3xl font-bold text-gray-800 mb-3">
                    {selectedMarket.name}
                  </Text>
                  {(marketWithDetails?.rating || marketWithDetails?.user_ratings_total) && (
                    <TouchableOpacity
                      onPress={openGoogleMapsReviews}
                      className="flex-row items-center gap-3 mt-2"
                    >
                      <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                        <Image
                          source={require('../../assets/icons/google.png')}
                          className="w-4 h-4"
                          resizeMode="contain"
                        />
                        <Text className="text-gray-700 font-semibold text-sm">
                          Google
                        </Text>
                      </View>
                      {marketWithDetails?.rating && (
                        <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1">
                          <Text className="text-lg">⭐</Text>
                          <Text className="text-gray-700 font-semibold text-sm">
                            {marketWithDetails.rating}
                          </Text>
                        </View>
                      )}
                      {marketWithDetails?.user_ratings_total && (
                        <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1">
                          <Text className="text-lg">💬</Text>
                          <Text className="text-gray-700 font-semibold text-sm">
                            {marketWithDetails.user_ratings_total} reviews
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Location */}
                {marketWithDetails?.formatted_address && (
                  <View className="mb-5 pb-5 bg-white rounded-3xl p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <View className="flex-row items-center gap-2 mb-3">
                      <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
                        <Text className="text-xl">📍</Text>
                      </View>
                      <Text className="text-lg font-bold text-gray-800">
                        Location
                      </Text>
                    </View>
                    <Text className="text-gray-600 text-base leading-6 ml-12 mb-3">
                      {marketWithDetails.formatted_address}
                    </Text>
                    <TouchableOpacity
                      onPress={openGoogleMapsDirections}
                      className="ml-12 bg-primary px-4 py-2.5 rounded-full flex-row items-center gap-2 self-start"
                    >
                      <Text className="text-lg">🧭</Text>
                      <Text className="text-white font-semibold text-sm">
                        Directions
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Social or Website */}
                {marketWithDetails?.website && (() => {
                  const { label, emoji } = getWebsiteBadge(marketWithDetails.website);

                  const safeUrl = marketWithDetails.website.startsWith('http')
                    ? marketWithDetails.website
                    : `https://${marketWithDetails.website}`;

                  return (
                    <View
                      className="mb-5 pb-5 bg-white rounded-3xl p-5"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                      }}
                    >
                      <View className="flex-row items-center gap-2 mb-3">
                        <TouchableOpacity
                          onPress={() => Linking.openURL(safeUrl)}
                          activeOpacity={0.7}
                          className="bg-secondary w-10 h-10 rounded-full justify-center items-center"
                        >
                          <Text className="text-xl">{emoji}</Text>
                        </TouchableOpacity>

                        <Text className="text-lg font-bold text-gray-800">
                          {label}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Date and Time */}
                <View className="mb-5 pb-5 bg-white rounded-3xl p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                  <View className="flex-row items-center gap-2 mb-4">
                    <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
                      <Text className="text-xl">📅</Text>
                    </View>
                    <Text className="text-lg font-bold text-gray-800">
                      Date and Time
                    </Text>
                  </View>
                  {weeklySchedule.length > 0 ? (
                    <View className="gap-2 ml-12">
                      {weeklySchedule.map((day, index) => (
                        <View key={index} className="bg-tertiary rounded-2xl p-3">
                          <Text className="text-gray-800 font-semibold text-base mb-1">
                            {day.day} {day.date}
                          </Text>
                          <Text className="text-primary font-semibold text-sm">
                            {day.openTime} - {day.closeTime}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="bg-tertiary rounded-2xl p-4 ml-12">
                      <Text className="text-gray-500 text-sm text-center">
                        No schedule available
                      </Text>
                    </View>
                  )}
                </View>

                {/* Reaction Fields */}
                <View className="mb-5">
                  <Text className="text-lg font-bold text-gray-800 mb-4 ml-2">
                    Market Info
                  </Text>
                  <View className="bg-white rounded-3xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <ReactionField
                      fieldName="parking"
                      label="🅿️ Parking"
                      placeId={selectedMarket.place_id}
                    />
                    <ReactionField
                      fieldName="petFriendly"
                      label="🐾 Pet Friendly"
                      placeId={selectedMarket.place_id}
                    />
                    <ReactionField
                      fieldName="reusable"
                      label="♻️ Reusable"
                      placeId={selectedMarket.place_id}
                    />
                    <ReactionField
                      fieldName="toilet"
                      label="🚻 Toilet"
                      placeId={selectedMarket.place_id}
                    />
                    <ReactionField
                      fieldName="liveMusic"
                      label="🎵 Live Music"
                      placeId={selectedMarket.place_id}
                    />
                    <ReactionField
                      fieldName="accessibility"
                      label="♿ Accessibility"
                      placeId={selectedMarket.place_id}
                    />
                  </View>
                </View>

                {/* Comments Section */}
                <View className="mb-5 pb-5 bg-white rounded-3xl p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                  <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center gap-2">
                      <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
                        <Text className="text-xl">💬</Text>
                      </View>
                      <Text className="text-lg font-bold text-gray-800">
                        Comments
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const next = !showCommentInput;
                        setShowCommentInput(next);
                        if (next) {
                          scrollCommentsIntoView();
                        }
                      }}
                      className="px-4 py-2 bg-primary rounded-full"
                      style={{ shadowColor: '#E69DB8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }}
                    >
                      <Text className="text-white text-xs font-bold">
                        {showCommentInput ? 'Cancel' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showCommentInput && (
                    <View className="mb-4">
                      <CommentInputComponent
                        onSubmit={handleAddComment}
                        onCancel={() => setShowCommentInput(false)}
                        loading={submittingComment}
                        onFocusInput={() => scrollCommentsIntoView()}
                      />
                    </View>
                  )}

                  {comments.length === 0 && !loadingComments ? (
                    <View className="bg-tertiary rounded-2xl p-6 items-center">
                      <Text className="text-gray-400 text-sm text-center">
                        No comments yet. Be the first to comment! 💭
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={comments}
                      keyExtractor={item => item.id || item.userId || `comment-${item.createdAt}`}
                      renderItem={({ item }) => (
                        <CommentItem
                          comment={item}
                          placeId={selectedMarket.place_id}
                          onDelete={handleDeleteComment}
                        />
                      )}
                      scrollEnabled={false}
                      onEndReached={handleLoadMore}
                      onEndReachedThreshold={0.5}
                      ListFooterComponent={
                        loadingComments ? (
                          <View className="py-4">
                            <ActivityIndicator size="small" color="#E69DB8" />
                          </View>
                        ) : null
                      }
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default MarketDetailModal;
