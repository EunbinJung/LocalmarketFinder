export type MyCommentItem = {
  commentId: string;
  placeId: string;
  text: string;
  createdAt?: any;
  marketName?: string;
};

export type MyReactionItem = {
  placeId: string;
  updatedAt?: any;
  marketName?: string;
  fields: Array<{ key: string; value: string }>;
};
