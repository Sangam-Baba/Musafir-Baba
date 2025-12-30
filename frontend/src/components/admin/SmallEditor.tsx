"use client";

import type React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Link2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ButtonExtension } from "@/components/tiptap/ButtonExtension";
interface BlogEditorProps {
  value?: string;
  onChange: (content: string) => void;
}

function ToolbarButton({
  onClick,
  isActive,
  icon: Icon,
  tooltip,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ElementType;
  tooltip: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "default" : "ghost"}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SmallEditor({ value = "", onChange }: BlogEditorProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      StarterKit.configure({
        codeBlock: {},
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ButtonExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none px-8 py-6 min-h-[60px]",
      },
    },
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = prompt("Enter link URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <TooltipProvider>
      <div className="w-full border rounded-lg bg-background shadow-sm">
        <div className="flex sticky top-1 items-center gap-1 border-b bg-gray-400 z-20 p-2 flex-wrap">
          {/* Text formatting group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={Bold}
              tooltip="Bold (Ctrl+B)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              icon={Italic}
              tooltip="Italic (Ctrl+I)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              icon={UnderlineIcon}
              tooltip="Underline (Ctrl+U)"
            />
          </div>

          {/* Headings group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              icon={Heading1}
              tooltip="Heading 1"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              icon={Heading2}
              tooltip="Heading 2"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              icon={Heading3}
              tooltip="Heading 3"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              }
              isActive={editor.isActive("heading", { level: 4 })}
              icon={Heading4}
              tooltip="Heading 4"
            />
          </div>

          {/* Insert elements group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={addLink}
              isActive={editor.isActive("link")}
              icon={Link2}
              tooltip="Insert Link"
            />

            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              icon={Unlink}
              tooltip="Remove Link"
            />
          </div>
        </div>

        <EditorContent editor={editor} className="prose-editor" />
      </div>
    </TooltipProvider>
  );
}
