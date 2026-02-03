import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db, ensureAuthenticated, getCurrentUserId } from '../../services/firebase';
import { deleteMarketComment } from '../../services/marketDetailsService';
import { useSearch } from '../../context/SearchContext';

const FEEDBACK_URL = 'https://github.com/EunbinJung/LocalmarketFinder/issues/new';

type MyCommentItem = {
  commentId: string;
  placeId: string;
  text: string;
  createdAt?: any;
  marketName?: string;
};

type MyReactionItem = {
  placeId: string;
  updatedAt?: any;
  marketName?: string;
  fields: Array<{ key: string; value: string }>;
};

function MyContent() {
  const { savedMarketIds } = useSearch();
  const [uid, setUid] = useState<string | null>(getCurrentUserId());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [comments, setComments] = useState<MyCommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [reactions, setReactions] = useState<MyReactionItem[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(false);

  const appMeta = useMemo(() => {
    const pkg = require('../../../package.json');
    const version = pkg?.version || '0.0.0';
    const rn = pkg?.dependencies?.['react-native'] || '';
    return {
      version,
      build: __DEV__ ? 'Debug' : 'Release',
      reactNative: typeof rn === 'string' ? rn.replace(/^[^\d]*/, '') : '',
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAuth = async () => {
      try {
        setLoading(true);
        const authedUid = await ensureAuthenticated();
        if (cancelled) return;
        setUid(authedUid);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMyComments = useCallback(async () => {
    if (!uid) return;
    setLoadingComments(true);
    try {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const refsRef = collection(db, 'users', uid, 'comments');

      let refsSnap;
      try {
        refsSnap = await getDocs(query(refsRef, orderBy('createdAt', 'desc')));
      } catch {
        refsSnap = await getDocs(refsRef);
      }

      const refs = refsSnap.docs
        .map(d => d.data() as any)
        .filter(d => d?.commentId && d?.placeId)
        .map(d => ({
          commentId: String(d.commentId),
          placeId: String(d.placeId),
          createdAt: d.createdAt,
        }));

      const { doc, getDoc } = await import('firebase/firestore');
      const results = await Promise.all(
        refs.map(async ref => {
          try {
            const commentRef = doc(
              db,
              'markets',
              ref.placeId,
              'details',
              'info',
              'comments',
              ref.commentId,
            );
            const [commentSnap, marketSnap] = await Promise.all([
              getDoc(commentRef),
              getDoc(doc(db, 'markets', ref.placeId)),
            ]);

            const commentData = commentSnap.exists() ? (commentSnap.data() as any) : null;
            const marketData = marketSnap.exists() ? (marketSnap.data() as any) : null;

            return {
              commentId: ref.commentId,
              placeId: ref.placeId,
              text: commentData?.text || '(Deleted)',
              createdAt: commentData?.createdAt || ref.createdAt,
              marketName: marketData?.name,
            } as MyCommentItem;
          } catch {
            return null;
          }
        }),
      );

      setComments(results.filter(Boolean) as MyCommentItem[]);
    } catch (error) {
      console.error('Error loading my comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [uid]);

  const loadMyReactions = useCallback(async () => {
    if (!uid) return;
    setLoadingReactions(true);
    try {
      // IMPORTANT:
      // Querying a collectionGroup by documentId() requires a *full document path* (even segments),
      // so filtering by just uid will throw an "odd number of segments" error.
      // We already maintain a user-centric reaction collection for backwards compatibility:
      // /userReactions/{uid}/reactions/{placeId}
      // Use that to show "My reactions" reliably.
      const { collection, getDocs, orderBy, query, doc, getDoc } = await import(
        'firebase/firestore'
      );

      const userReactionsRef = collection(db, 'userReactions', uid, 'reactions');
      let snap;
      try {
        snap = await getDocs(query(userReactionsRef, orderBy('updatedAt', 'desc')));
      } catch {
        snap = await getDocs(userReactionsRef);
      }

      let items = await Promise.all(
        snap.docs.map(async reactionDoc => {
          try {
            const placeId = reactionDoc.id;
            const data = reactionDoc.data() as any;

            const fields = Object.entries(data || {})
              .filter(([k, v]) => {
                if (k === 'updatedAt') return false;
                if (k === 'createdAt') return false;
                if (k === 'placeId') return false;
                return v !== null && v !== undefined && v !== '';
              })
              .map(([k, v]) => ({ key: k, value: String(v) }));

            if (fields.length === 0) return null;

            const marketSnap = await getDoc(doc(db, 'markets', placeId));
            const marketName = marketSnap.exists()
              ? (marketSnap.data() as any)?.name
              : undefined;

            return {
              placeId,
              updatedAt: data?.updatedAt,
              marketName,
              fields,
            } as MyReactionItem;
          } catch {
            return null;
          }
        }),
      );

      const base = (items.filter(Boolean) as MyReactionItem[]).filter(i => i.fields.length > 0);

      // If empty, try reading "new" per-market userReactions docs for saved markets.
      // This helps display reactions that were recorded under:
      // markets/{placeId}/details/info/userReactions/{uid}
      if (base.length === 0 && Array.isArray(savedMarketIds) && savedMarketIds.length > 0) {
        const candidateIds = savedMarketIds.slice(0, 30);
        const detailDocs = await Promise.all(
          candidateIds.map(async placeId => {
            try {
              const ref = doc(
                db,
                'markets',
                placeId,
                'details',
                'info',
                'userReactions',
                uid,
              );
              const snap = await getDoc(ref);
              if (!snap.exists()) return null;

              const data = snap.data() as any;
              const fields = Object.entries(data || {})
                .filter(([k, v]) => {
                  if (k === 'updatedAt') return false;
                  if (k === 'createdAt') return false;
                  if (k === 'placeId') return false;
                  if (k === 'userId') return false;
                  return v !== null && v !== undefined && v !== '';
                })
                .map(([k, v]) => ({ key: k, value: String(v) }));

              if (fields.length === 0) return null;

              const marketSnap = await getDoc(doc(db, 'markets', placeId));
              const marketName = marketSnap.exists()
                ? (marketSnap.data() as any)?.name
                : undefined;

              return {
                placeId,
                updatedAt: data?.updatedAt,
                marketName,
                fields,
              } as MyReactionItem;
            } catch {
              return null;
            }
          }),
        );

        const fallback = (detailDocs.filter(Boolean) as MyReactionItem[]).filter(
          i => i.fields.length > 0,
        );
        setReactions(fallback);
        return;
      }

      setReactions(base);
    } catch (error) {
      console.error('Error loading my reactions:', error);
      setReactions([]);
    } finally {
      setLoadingReactions(false);
    }
  }, [uid, savedMarketIds]);

  const refreshAll = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      await Promise.all([loadMyComments(), loadMyReactions()]);
    } finally {
      setRefreshing(false);
    }
  }, [uid, loadMyComments, loadMyReactions]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#E69DB8" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAll}
          tintColor="#E69DB8"
        />
      }
    >
      {/* Data / Account */}
      <View className="mx-4 mt-3 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
        <Text className="text-lg font-bold text-gray-900">🧾 Data / Account</Text>
        <Text className="text-sm text-gray-600 mt-1">Anonymous user id</Text>
        <View className="mt-4 bg-tertiary rounded-2xl px-4 py-3">
          <Text className="text-xs text-gray-600 font-semibold">User ID</Text>
          <Text className="text-sm text-gray-900 font-semibold mt-1">{uid || '—'}</Text>
        </View>
      </View>

      {/* My activity - Comments */}
      <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-900">💬 My comments</Text>
            <Text className="text-sm text-gray-600 mt-1">Your recent comments</Text>
          </View>
          {loadingComments && <ActivityIndicator size="small" color="#E69DB8" />}
        </View>

        {comments.length === 0 && !loadingComments ? (
          <Text className="text-gray-600 mt-4">No comments yet.</Text>
        ) : (
          <View className="mt-4 gap-3">
            {comments.slice(0, 10).map(c => (
              <View
                key={`${c.placeId}:${c.commentId}`}
                className="bg-tertiary rounded-2xl p-4"
              >
                <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                  {c.marketName || c.placeId}
                </Text>
                <Text className="text-gray-700 mt-2">{c.text}</Text>
                <View className="flex-row justify-end mt-3">
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Delete comment',
                        'Are you sure you want to delete this comment?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              const ok = await deleteMarketComment(c.placeId, c.commentId);
                              if (ok) {
                                setComments(prev =>
                                  prev.filter(
                                    x =>
                                      !(
                                        x.placeId === c.placeId &&
                                        x.commentId === c.commentId
                                      ),
                                  ),
                                );
                              } else {
                                Alert.alert('Error', 'Failed to delete comment.');
                              }
                            },
                          },
                        ],
                      );
                    }}
                    className="px-4 py-2 rounded-full bg-white"
                    activeOpacity={0.85}
                  >
                    <Text className="text-primary font-semibold">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* My activity - Reactions */}
      <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-900">✨ My reactions</Text>
            <Text className="text-sm text-gray-600 mt-1">Your saved votes</Text>
          </View>
          {loadingReactions && <ActivityIndicator size="small" color="#E69DB8" />}
        </View>

        {reactions.length === 0 && !loadingReactions ? (
          <Text className="text-gray-600 mt-4">No reactions yet.</Text>
        ) : (
          <View className="mt-4 gap-3">
            {reactions.slice(0, 10).map(r => (
              <View key={r.placeId} className="bg-tertiary rounded-2xl p-4">
                <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                  {r.marketName || r.placeId}
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-3">
                  {r.fields.slice(0, 8).map(f => (
                    <View key={f.key} className="bg-white px-3 py-1.5 rounded-full">
                      <Text className="text-gray-700 text-xs font-semibold">
                        {f.key}: {f.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* App info */}
      <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
        <Text className="text-lg font-bold text-gray-900">📱 App info</Text>
        <View className="mt-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Version</Text>
            <Text className="text-gray-900 font-semibold">{appMeta.version}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Build</Text>
            <Text className="text-gray-900 font-semibold">{appMeta.build}</Text>
          </View>
          {!!appMeta.reactNative && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600">React Native</Text>
              <Text className="text-gray-900 font-semibold">{appMeta.reactNative}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Feedback */}
      <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
        <Text className="text-lg font-bold text-gray-900">🧑‍💻 Feedback</Text>
        <Text className="text-gray-600 mt-2">
          Report bugs or request features via GitHub Issues.
        </Text>
        <TouchableOpacity
          onPress={() => {
            Linking.openURL(FEEDBACK_URL).catch(() => {
              Alert.alert('Error', 'Could not open the feedback page.');
            });
          }}
          activeOpacity={0.85}
          className="mt-4 bg-primary px-4 py-3 rounded-2xl"
        >
          <Text className="text-white font-semibold text-center">
            Open GitHub Issues
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default MyContent;

