import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ReactionField as ReactionFieldType } from '../../utils/reactionStorage';
import { getUserReaction } from '../../utils/reactionStorage';
import {
  getMarketInfo,
  hasNewInfoWithTieHandling,
  isFieldEmpty,
  getUserReactionFromSubcollection,
  getDisplayedValue,
} from '../../services/reactionService';
import ReactionModal from './ReactionModal';

interface ReactionFieldProps {
  fieldName: ReactionFieldType;
  label: string;
  placeId: string;
  counts?: { yes: number; no: number };
}

function ReactionField({
  fieldName,
  label,
  placeId,
  counts: _counts,
}: ReactionFieldProps) {
  const [userReaction, setUserReaction] = useState<'yes' | 'no' | 'Free' | 'Paid' | 'Street' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [hasNew, setHasNew] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const loadUserReaction = useCallback(async () => {
    // Try new subcollection first, fallback to old method
    const reaction =
      (await getUserReactionFromSubcollection(placeId, fieldName)) ||
      (await getUserReaction(placeId, fieldName));
    // Type assertion for parking field (Free/Paid/Street) vs other fields (yes/no)
    setUserReaction(reaction as 'yes' | 'no' | 'Free' | 'Paid' | 'Street' | null);
  }, [placeId, fieldName]);

  const loadMarketInfo = useCallback(async () => {
    const info = await getMarketInfo(placeId);
    setMarketInfo(info);
    if (info) {
      // Use new tie handling logic
      setHasNew(hasNewInfoWithTieHandling(fieldName, info));
      setIsEmpty(isFieldEmpty(fieldName, info));
    }
  }, [placeId, fieldName]);

  const handleReactionUpdate = useCallback(() => {
    loadUserReaction();
    loadMarketInfo();
  }, [loadUserReaction, loadMarketInfo]);

  useEffect(() => {
    loadUserReaction();
    loadMarketInfo();
  }, [loadUserReaction, loadMarketInfo]);

  // Handle parking field (Free, Paid, Street) vs other fields (Yes/No)
  const isParking = fieldName === 'parking';
  
  // Get displayed value (determined field)
  const displayedValue = getDisplayedValue(fieldName, marketInfo);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        className="flex-row items-center justify-between p-4 bg-white rounded-3xl mb-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
        activeOpacity={0.7}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-2 flex-wrap">
            <Text className="text-base font-bold text-gray-800">
              {label}
            </Text>
            {hasNew && (
              <View className="bg-secondary px-3 py-1 rounded-full">
                <Text className="text-gray-700 text-xs font-bold">
                  ✨ New
                </Text>
              </View>
            )}
            {userReaction && (
              <View className="bg-primary px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">
                  {isParking
                    ? `✓ ${userReaction}`
                    : userReaction === 'yes'
                    ? '✓ Yes'
                    : '✗ No'}
                </Text>
              </View>
            )}
          </View>
          {isEmpty ? (
            <View className="bg-tertiary rounded-2xl p-3 mt-2">
              <Text className="text-gray-600 text-sm text-center">
                Be the first to react!{'\n'}
                Make your reaction and help others ✨
              </Text>
            </View>
          ) : displayedValue ? (
            <View className="bg-tertiary px-3 py-1.5 rounded-full flex-row items-center gap-1.5 mt-2 self-start">
              {isParking ? (
                <>
                  {displayedValue === 'Free' && <Text className="text-lg">🅿️</Text>}
                  {displayedValue === 'Paid' && <Text className="text-lg">💰</Text>}
                  {displayedValue === 'Street' && <Text className="text-lg">🛣️</Text>}
                  <Text className="text-sm text-gray-700 font-semibold">
                    {displayedValue}
                  </Text>
                </>
              ) : (
                <>
                  {displayedValue === 'Yes' && <Text className="text-lg">👍</Text>}
                  {displayedValue === 'No' && <Text className="text-lg">👎</Text>}
                  <Text className="text-sm text-gray-700 font-semibold">
                    {displayedValue}
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </View>
        <View className="bg-tertiary w-8 h-8 rounded-full justify-center items-center ml-3">
          <Text className="text-gray-400 text-xl font-bold">›</Text>
        </View>
      </TouchableOpacity>

      <ReactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        fieldName={fieldName}
        label={label}
        placeId={placeId}
        currentReaction={userReaction as any}
        onReactionUpdate={handleReactionUpdate}
      />
    </>
  );
}

export default ReactionField;
