import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSearch } from '../../context/SearchContext';
import {
  getMarketDetails,
  saveMarketDetails,
  addMarketComment,
  getMarketComments,
  MarketDetailData,
  Comment,
} from '../../services/marketDetailsService';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { calculateNextOpenDay } from '../marketList/marketCard/utils/calculateNextOpenDay';

// Helper function to format Firebase Timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    return 'Recently';
  } catch {
    return 'Recently';
  }
};

interface FieldSectionProps {
  title: string;
  value: string | React.ReactNode;
  fieldName?: string;
  placeId: string;
  onCommentAdd: (field: string, comment: string) => void;
  comments: Comment[];
}

function FieldSection({
  title,
  value,
  fieldName,
  placeId,
  onCommentAdd,
  comments,
}: FieldSectionProps) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');

  const fieldComments = comments.filter(c => c.field === fieldName);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onCommentAdd(fieldName || 'general', commentText);
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  return (
    <View className="mb-4 pb-4 border-b border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-800">{title}</Text>
        <TouchableOpacity
          onPress={() => setShowCommentInput(!showCommentInput)}
          className="px-3 py-1 bg-primary rounded-full"
        >
          <Text className="text-white text-xs">💬</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-gray-600 mb-2">{value || 'No information'}</Text>

      {showCommentInput && (
        <View className="mt-2 mb-2">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            multiline
            className="border border-gray-300 rounded-lg p-2 text-gray-700 min-h-[60px]"
          />
          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              onPress={handleSubmitComment}
              className="flex-1 bg-primary py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Submit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowCommentInput(false);
                setCommentText('');
              }}
              className="flex-1 bg-gray-300 py-2 rounded-lg"
            >
              <Text className="text-gray-700 text-center font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {fieldComments.length > 0 && (
        <View className="mt-2">
          <Text className="text-sm font-semibold text-gray-700 mb-1">
            Comments ({fieldComments.length})
          </Text>
          {fieldComments.map(comment => (
            <View key={comment.id} className="bg-gray-50 p-2 rounded-lg mb-1">
              <Text className="text-sm text-gray-600">{comment.text}</Text>
              <Text className="text-xs text-gray-400 mt-1">
                {formatTimestamp(comment.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MarketDetailModal() {
  const { selectedMarket, setSelectedMarket } = useSearch();
  const [marketDetails, setMarketDetails] = useState<MarketDetailData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeField, setActiveField] = useState<string>('');

  useEffect(() => {
    if (selectedMarket) {
      loadMarketDetails();
      loadComments();
    }
  }, [selectedMarket]);

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

  const loadComments = async () => {
    if (!selectedMarket) return;
    try {
      const marketComments = await getMarketComments(selectedMarket.place_id);
      setComments(marketComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (field: string, commentText: string) => {
    if (!selectedMarket) return;
    setSaving(true);
    try {
      await addMarketComment(selectedMarket.place_id, {
        field,
        text: commentText,
        userId: 'anonymous', // TODO: Replace with actual user ID
        userName: 'User',
      });
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSaving(false);
    }
  };

  const photoUrl = selectedMarket?.photos?.[0]?.photo_reference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${selectedMarket.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
    : marketDetails?.representativePhoto || null;

  const nextOpenInfo = calculateNextOpenDay(
    selectedMarket?.details?.opening_hours?.periods,
  );

  if (!selectedMarket) return null;

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
        <View className="flex-1 bg-white pt-12">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 pb-4 border-b border-gray-200">
            <Text className="text-2xl font-bold text-gray-800">
              Market Details
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedMarket(null)}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              <Text className="text-gray-700 font-semibold">Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#FF8A65" />
            </View>
          ) : (
            <ScrollView className="flex-1 px-4">
              {/* Representative Photo */}
              {photoUrl && (
                <View className="mt-4 mb-4">
                  <Image
                    source={{ uri: photoUrl }}
                    className="w-full h-64 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Market Name */}
              <View className="mb-4 pb-4 border-b border-gray-200">
                <Text className="text-3xl font-bold text-gray-800 mb-2">
                  {selectedMarket.name}
                </Text>
                <View className="flex-row items-center gap-4">
                  {selectedMarket.rating && (
                    <Text className="text-gray-600">
                      ⭐ {selectedMarket.rating}
                    </Text>
                  )}
                  {selectedMarket.user_ratings_total && (
                    <Text className="text-gray-600">
                      💬 {selectedMarket.user_ratings_total} reviews
                    </Text>
                  )}
                </View>
              </View>

              {/* Location */}
              <FieldSection
                title="📍 Location"
                value={
                  marketDetails?.location ||
                  selectedMarket.details?.formatted_address ||
                  'No address available'
                }
                fieldName="location"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Open Date and Time */}
              <FieldSection
                title="🕐 Open Date and Time"
                value={
                  nextOpenInfo.text ||
                  marketDetails?.openDateAndTime ||
                  'No schedule available'
                }
                fieldName="openDateAndTime"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Social Link */}
              <FieldSection
                title="🔗 Social Link"
                value={
                  marketDetails?.socialLink ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (marketDetails.socialLink) {
                          Linking.openURL(marketDetails.socialLink);
                        }
                      }}
                    >
                      <Text className="text-blue-500 underline">
                        {marketDetails.socialLink}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    'No social link'
                  )
                }
                fieldName="socialLink"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Pet Friendly */}
              <FieldSection
                title="🐾 Pet Friendly"
                value={marketDetails?.petFriendly || 'No information available'}
                fieldName="petFriendly"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Reusable */}
              <FieldSection
                title="♻️ Reusable"
                value={marketDetails?.reusable || 'No information available'}
                fieldName="reusable"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Toilet */}
              <FieldSection
                title="🚻 Toilet"
                value={marketDetails?.toilet || 'No information available'}
                fieldName="toilet"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Live Music */}
              <FieldSection
                title="🎵 Live Music"
                value={
                  marketDetails?.liveMusic ? (
                    <View>
                      <Text className="text-gray-600">
                        {marketDetails.liveMusic.available === 'yes'
                          ? `Yes${marketDetails.liveMusic.time ? ` - ${marketDetails.liveMusic.time}` : ''}`
                          : 'No'}
                      </Text>
                    </View>
                  ) : (
                    'No information available'
                  )
                }
                fieldName="liveMusic"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Parking */}
              <FieldSection
                title="🅿️ Parking"
                value={
                  marketDetails?.parking ? (
                    <View>
                      <Text className="text-gray-600">
                        {marketDetails.parking.type}
                      </Text>
                      {marketDetails.parking.link && (
                        <TouchableOpacity
                          onPress={() => {
                            Linking.openURL(marketDetails.parking!.link!);
                          }}
                        >
                          <Text className="text-blue-500 underline mt-1">
                            {marketDetails.parking.link}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    'No information available'
                  )
                }
                fieldName="parking"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* Accessibility */}
              <FieldSection
                title="♿ Accessibility"
                value={
                  marketDetails?.accessibility ? (
                    <View>
                      {marketDetails.accessibility.transportInfo && (
                        <Text className="text-gray-600 mb-1">
                          Transport: {marketDetails.accessibility.transportInfo}
                        </Text>
                      )}
                      {marketDetails.accessibility.wheelchairAccessible && (
                        <Text className="text-gray-600">
                          Wheelchair Accessible:{' '}
                          {marketDetails.accessibility.wheelchairAccessible}
                        </Text>
                      )}
                    </View>
                  ) : (
                    'No information available'
                  )
                }
                fieldName="accessibility"
                placeId={selectedMarket.place_id}
                onCommentAdd={handleAddComment}
                comments={comments}
              />

              {/* General Comments Section */}
              <View className="mb-4 pb-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  💬 General Comments
                </Text>
                {comments
                  .filter(c => !c.field || c.field === 'general')
                  .map(comment => (
                    <View
                      key={comment.id}
                      className="bg-gray-50 p-3 rounded-lg mb-2"
                    >
                      <Text className="text-sm text-gray-600">
                        {comment.text}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1">
                        {comment.createdAt?.toDate?.().toLocaleDateString() ||
                          'Recently'}
                      </Text>
                    </View>
                  ))}
                {comments.filter(c => !c.field || c.field === 'general')
                  .length === 0 && (
                  <Text className="text-gray-500 text-sm">
                    No comments yet. Be the first to comment!
                  </Text>
                )}
              </View>

              {saving && (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#FF8A65" />
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default MarketDetailModal;
