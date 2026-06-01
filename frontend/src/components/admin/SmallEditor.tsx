"use client";

import type React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code2,
  ImageIcon,
  Link2,
  Unlink,
  Undo,
  Redo,
  TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            href: {
              default: null,
            },
            loading: {
              default: "lazy",
              renderHTML: () => ({ loading: "lazy" }),
            },
            decoding: {
              default: "async",
              renderHTML: () => ({ decoding: "async" }),
            },
          };
        },
        renderHTML({ HTMLAttributes }) {
          const { href, ...rest } = HTMLAttributes;
          const img = ["img", rest];
          if (href) {
            return ["a", { href, target: "_blank", rel: "noopener noreferrer" }, img];
          }
          return img;
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ButtonExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[60px]",
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

  const addImage = () => {
    const url = prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    if (editor.isActive("image")) {
      const currentHref = editor.getAttributes("image").href;
      const url = prompt("Enter link URL for Image", currentHref || "");
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().updateAttributes("image", { href: null }).run();
        return;
      }
      editor.chain().focus().updateAttributes("image", { href: url }).run();
      return;
    }

    const url = prompt("Enter link URL");
    let rel = "noopener noreferrer nofollow";
    if (url) {
      if (url.startsWith("https://musafirbaba.com")) {
        rel = "noopener noreferrer";
      }
      editor.chain().focus().setLink({ href: url, rel: rel }).run();
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full border rounded-lg bg-background shadow-sm flex flex-col h-[300px] overflow-hidden">
        <div className="flex items-center gap-1 border-b bg-gray-400 z-20 p-2 flex-wrap shrink-0">
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
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              icon={Strikethrough}
              tooltip="Strikethrough (Ctrl+Shift+X)"
            />
          </div>

          <Separator orientation="vertical" className="h-8" />

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

          <Separator orientation="vertical" className="h-8" />

          {/* Text alignment group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              icon={AlignLeft}
              tooltip="Align Left"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              icon={AlignCenter}
              tooltip="Align Center"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              icon={AlignRight}
              tooltip="Align Right"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              icon={AlignJustify}
              tooltip="Justify"
            />
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Lists group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={List}
              tooltip="Bullet List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              icon={ListOrdered}
              tooltip="Numbered List"
            />
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Insert elements group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              icon={Quote}
              tooltip="Quote"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              icon={Code2}
              tooltip="Code Block"
            />
            <ToolbarButton
              onClick={addImage}
              icon={ImageIcon}
              tooltip="Insert Image"
            />
            <ToolbarButton
              onClick={addLink}
              isActive={editor.isActive("link")}
              icon={Link2}
              tooltip="Insert Link"
            />

            <ToolbarButton
              onClick={() => {
                if (editor.isActive("image")) {
                  editor.chain().focus().updateAttributes("image", { href: null }).run();
                } else {
                  editor.chain().focus().unsetLink().run();
                }
              }}
              icon={Unlink}
              tooltip="Remove Link"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3 })
                      .run()
                  }
                >
                  Insert Table
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                  Add Column Before
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  Add Column After
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                  Delete Column
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                  Add Row Before
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  Add Row After
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  Delete Row
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteTable().run()}
                >
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* History group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              icon={Undo}
              tooltip="Undo (Ctrl+Z)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              icon={Redo}
              tooltip="Redo (Ctrl+Y)"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <EditorContent editor={editor} className="prose-editor" />
        </div>
      </div>
    </TooltipProvider>
  );
}
