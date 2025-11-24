"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import CommentPage from "@/components/custom/Comment";
import NewsCommentPage from "@/components/custom/NewsComment";

interface Comment {
  _id: string;
  blogId: string;
  newsId: string;
  parentId?: string | null;
  name: string;
  email: string;
  text: string;
  rating: number;
  createdAt: string;
  replies: Comment[];
}

function buildTree(comments: Comment[]): Comment[] {
  const map: Record<string, Comment & { replies: Comment[] }> = {};
  const roots: Comment[] = [];

  comments.forEach((c) => {
    map[c._id] = { ...c, replies: [] };
  });

  comments.forEach((c) => {
    if (c.parentId) {
      map[c.parentId]?.replies.push(map[c._id]);
    } else {
      roots.push(map[c._id]);
    }
  });

  return roots;
}

function CommentList({
  comments,
  blogId,
  type,
}: {
  comments: Comment[];
  blogId: string;
  type: string;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c._id} className="border rounded-lg p-3">
          <div className="flex justify-between">
            <p className="text-md text-gray-800">{c.text}</p>
            <span className="text-xs text-gray-500">
              {new Date(c.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-gray-600">{c.name}</span>
              {/* <span className="text-xs">⭐ {c.rating}</span> */}
            </div>
            <Button
              onClick={() => setReplyingTo(replyingTo === c._id ? null : c._id)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Reply
            </Button>
          </div>

          {replyingTo === c._id && (
            <div className="mt-3">
              {type === "blog" && (
                <CommentPage
                  id={blogId}
                  parentId={c._id}
                  onSuccess={() => setReplyingTo(null)}
                />
              )}
              {type === "news" && (
                <NewsCommentPage
                  id={blogId}
                  parentId={c._id}
                  onSuccess={() => setReplyingTo(null)}
                />
              )}
            </div>
          )}

          {c.replies.length > 0 && (
            <div className="ml-6 mt-4">
              <CommentList comments={c.replies} blogId={blogId} type={type} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BlogComments({
  blogId,
  initialComments,
  type,
}: {
  blogId: string;
  initialComments: Comment[];
  type: string;
}) {
  const tree = buildTree(initialComments);

  return (
    <section className="mt-10 w-full">
      <h2 className="text-xl font-semibold mb-4">
        Comments ({initialComments.length})
      </h2>
      {type === "news" && <NewsCommentPage id={blogId} onSuccess={() => {}} />}
      {type === "blog" && <CommentPage id={blogId} onSuccess={() => {}} />}

      <div className="mt-4">
        <CommentList comments={tree} blogId={blogId} type={type} />
      </div>
    </section>
  );
}
