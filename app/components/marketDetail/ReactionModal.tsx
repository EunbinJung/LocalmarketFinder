import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ReactionField, ReactionValue } from '../../utils/reactionStorage';
import { setUserReaction } from '../../utils/reactionStorage';
import { updateReactionWithTransaction } from '../../services/reactionService';

interface ReactionModalProps {
  visible: boolean;
  onClose: () => void;
  fieldName: ReactionField;
  label: string;
  placeId: string;
  currentReaction: ReactionValue | 'Free' | 'Paid' | 'Street' | null;
  onReactionUpdate: () => void;
}

function ReactionModal({
  visible,
  onClose,
  fieldName,
  label,
  placeId,
  currentReaction,
  onReactionUpdate,
}: ReactionModalProps) {
  const isParking = fieldName === 'parking';
  const [selectedReaction, setSelectedReaction] = useState<
    ReactionValue | 'Free' | 'Paid' | 'Street' | null
  >(currentReaction as any);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setSelectedReaction(currentReaction as any);
  }, [currentReaction]);

  const handleReactionSelect = (
    reaction: ReactionValue | 'Free' | 'Paid' | 'Street' | null,
  ) => {
    // If clicking the same reaction, do nothing (keep it selected)
    if (selectedReaction === reaction) {
      return;
    }
    
    // If changing to a different reaction, show confirmation
    if (currentReaction && currentReaction !== reaction) {
      Alert.alert(
        '리액션 변경',
        '정말 바꾸시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '확인',
            onPress: () => setSelectedReaction(reaction),
          },
        ],
      );
    } else {
      // No current reaction, just select
      setSelectedReaction(reaction);
    }
  };

  const handleConfirm = async () => {
    if (selectedReaction === currentReaction) {
      onClose();
      return;
    }

    // If removing reaction, show confirmation
    if (currentReaction && !selectedReaction) {
      Alert.alert(
        '리액션 제거',
        '정말 리액션을 제거하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '제거',
            style: 'destructive',
            onPress: handleSave,
          },
        ],
      );
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if same reaction (no-op)
      if (selectedReaction === currentReaction) {
        onClose();
        return;
      }

      // Use new transaction-based update (atomic and safe)
      // Parking field accepts 'Free' | 'Paid' | 'Street', other fields accept 'yes' | 'no'
      await updateReactionWithTransaction(
        placeId,
        fieldName,
        selectedReaction as any,
      );

      // Also update local storage for backward compatibility (only for non-parking fields)
      if (!isParking) {
        await setUserReaction(
          placeId,
          fieldName,
          selectedReaction as ReactionValue,
        );
      }

      onReactionUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving reaction:', error);
      Alert.alert('Error', 'Failed to save reaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            {label}
          </Text>

          <Text className="text-gray-600 mb-6 text-center">
            {isParking
              ? 'What type of parking is available?'
              : 'How would you react to this information?'}
          </Text>

          <View className="gap-3 mb-6">
            {isParking ? (
              <>
                <TouchableOpacity
                  onPress={() => handleReactionSelect('Free')}
                  className={`flex-row items-center justify-center p-4 rounded-lg border-2 ${
                    selectedReaction === 'Free'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mr-2">🅿️</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedReaction === 'Free'
                        ? 'text-green-700'
                        : 'text-gray-700'
                    }`}
                  >
                    Free
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleReactionSelect('Paid')}
                  className={`flex-row items-center justify-center p-4 rounded-lg border-2 ${
                    selectedReaction === 'Paid'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mr-2">💰</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedReaction === 'Paid'
                        ? 'text-blue-700'
                        : 'text-gray-700'
                    }`}
                  >
                    Paid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleReactionSelect('Street')}
                  className={`flex-row items-center justify-center p-4 rounded-lg border-2 ${
                    selectedReaction === 'Street'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mr-2">🛣️</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedReaction === 'Street'
                        ? 'text-orange-700'
                        : 'text-gray-700'
                    }`}
                  >
                    Street
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleReactionSelect('yes')}
                  className={`flex-row items-center justify-center p-4 rounded-lg border-2 ${
                    selectedReaction === 'yes'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mr-2">👍</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedReaction === 'yes'
                        ? 'text-green-700'
                        : 'text-gray-700'
                    }`}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleReactionSelect('no')}
                  className={`flex-row items-center justify-center p-4 rounded-lg border-2 ${
                    selectedReaction === 'no'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mr-2">👎</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      selectedReaction === 'no' ? 'text-red-700' : 'text-gray-700'
                    }`}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              className="flex-1 bg-gray-200 py-3 rounded-lg"
            >
              <Text className="text-gray-700 text-center font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={saving}
              className="flex-1 bg-primary py-3 rounded-lg"
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">
                  Confirm
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ReactionModal;
