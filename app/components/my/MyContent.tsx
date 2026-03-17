import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, View } from 'react-native';
import { db, ensureAuthenticated, getCurrentUserId } from '../../services/firebase';
import { deleteMarketComment } from '../../services/marketDetailsService';
import { useSearch } from '../../context/SearchContext';
import { MyCommentItem, MyReactionItem } from './types';
import MyAccountCard from './sections/MyAccountCard';
import MyComments from './sections/MyComments';
import MyReactions from './sections/MyReactions';
import MyAppInfo from './sections/MyAppInfo';
import MyFeedback from './sections/MyFeedback';

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
    } catch {
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
    } catch {
      setReactions([]);
    } finally {
      setLoadingReactions(false);
    }
  }, [uid, savedMarketIds]);

  const handleDeleteComment = useCallback(async (placeId: string, commentId: string) => {
    const ok = await deleteMarketComment(placeId, commentId);
    if (ok) {
      setComments(prev =>
        prev.filter(x => !(x.placeId === placeId && x.commentId === commentId)),
      );
    } else {
      Alert.alert('Error', 'Failed to delete comment.');
    }
  }, []);

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
      <MyAccountCard uid={uid} />
      <MyComments
        comments={comments}
        loadingComments={loadingComments}
        onDelete={handleDeleteComment}
      />
      <MyReactions reactions={reactions} loadingReactions={loadingReactions} />
      <MyAppInfo appMeta={appMeta} />
      <MyFeedback />
    </ScrollView>
  );
}

export default MyContent;
