"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { BlogComments, Comment } from "@/components/custom/BuildCommentTree";
import { MessageSquareText } from "lucide-react";
// import { useMediaQuery } from "@/hooks/use-media-query"
export function CommentDailog({
  blogId,
  initialComments,
  type,
}: {
  blogId: string;
  initialComments: Comment[];
  type: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="w-full bg-gray-600 text-white hover:bg-[#FE5300]/80"
        >
          <MessageSquareText />
          Read Comments
        </Button>
      </DrawerTrigger>
      <DrawerContent className="px-4">
        <BlogComments
          blogId={blogId}
          initialComments={initialComments}
          type={type}
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
