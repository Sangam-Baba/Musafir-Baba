"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Reply } from "lucide-react";

interface Comment {
  _id: string;
  content: string;
  authorId: {
    _id: string;
    name: string;
    role: string;
  };
  parentId: string | null;
  createdAt: string;
}

interface Props {
  recordId: string;
  accessToken: string;
}

const DiscussionThread: React.FC<Props> = ({ recordId, accessToken }) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["sales-record-comments", recordId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/sales-record/${recordId}/comments`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch comments");
      return data.data as Comment[];
    },
  });

  const postCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string | null }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/sales-record/${recordId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content, parentId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post comment");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-record-comments", recordId] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    postCommentMutation.mutate({ content: newComment });
  };

  const handlePostReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    postCommentMutation.mutate({ content: replyContent, parentId });
  };

  if (isLoading) return <div className="py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const topLevelComments = comments?.filter((c) => !c.parentId) || [];
  const getReplies = (parentId: string) => comments?.filter((c) => c.parentId === parentId) || [];

  const CommentNode = ({ comment }: { comment: Comment }) => (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-semibold text-slate-800">{comment.authorId?.name || "Unknown"}</span>
          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {comment.authorId?.role || "Staff"}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.content}</p>
      
      <div>
        <button
          onClick={() => {
            setReplyingTo(comment._id);
            setReplyContent("");
          }}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
      </div>

      {replyingTo === comment._id && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            className="flex-1 text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <button
            onClick={() => handlePostReply(comment._id)}
            disabled={postCommentMutation.isPending}
            className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
          >
            Reply
          </button>
          <button
            onClick={() => setReplyingTo(null)}
            className="px-4 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Render Replies */}
      {getReplies(comment._id).length > 0 && (
        <div className="pl-6 border-l-2 border-slate-200 mt-4 space-y-4">
          {getReplies(comment._id).map((reply) => (
            <CommentNode key={reply._id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Discussion</h3>
      
      {/* New Comment Input */}
      <form onSubmit={handlePostComment} className="flex gap-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
        <button
          type="submit"
          disabled={postCommentMutation.isPending || !newComment.trim()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors self-end disabled:opacity-50"
        >
          {postCommentMutation.isPending ? "Posting..." : "Post"}
        </button>
      </form>

      {/* Comment List */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No comments yet. Start the discussion!</p>
        ) : (
          topLevelComments.map((comment) => (
            <CommentNode key={comment._id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
};

export default DiscussionThread;
