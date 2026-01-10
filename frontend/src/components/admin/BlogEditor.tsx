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
  MousePointer2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import MediaPicker from "../common/MediaList";
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

export default function BlogEditor({ value = "", onChange }: BlogEditorProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonHref, setButtonHref] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);

  const CustomLink = Link.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        rel: {
          default: null,
          renderHTML: (attributes) => {
            if (!attributes.rel) return {};
            return { rel: attributes.rel };
          },
        },
        target: {
          default: "_blank",
        },
      };
    },
  });

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
      CustomLink.configure({
        openOnClick: false,
      }),
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
          "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none px-8 py-6 min-h-[400px]",
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
    setMediaOpen(true);
  };

  const addLink = () => {
    const url = prompt("Enter link URL");
    let rel = "noopener noreferrer nofollow";
    if (url) {
      if (url.startsWith("https://musafirbaba.com")) {
        rel = "noopener noreferrer";
      }
      editor.chain().focus().setLink({ href: url, rel: rel }).run();
    }
  };

  const handleInsertButton = () => {
    if (buttonText && buttonHref && editor) {
      editor
        .chain()
        .focus()
        .setButton({ text: buttonText, href: buttonHref })
        .run();
      setButtonText("");
      setButtonHref("");
      setButtonDialogOpen(false);
    }
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
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              icon={Strikethrough}
              tooltip="Strikethrough"
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

          <Separator orientation="vertical" className="h-8" color="#FE5300" />

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
              onClick={() => editor.chain().focus().unsetLink().run()}
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
                  onClick={() => editor.chain().focus().mergeCells().run()}
                >
                  Merge Cells
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().splitCell().run()}
                >
                  Split Cell
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="text-destructive"
                >
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-8" color="#FE5300" />

          {/* History group */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo}
              tooltip="Undo (Ctrl+Z)"
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo}
              tooltip="Redo (Ctrl+Y)"
              disabled={!editor.can().redo()}
            />
          </div>

          <Separator orientation="vertical" className="h-8" color="#FE5300" />

          {/* Button */}
          <ToolbarButton
            onClick={() => setButtonDialogOpen(true)}
            icon={MousePointer2}
            tooltip="Insert Button"
          />
        </div>

        <EditorContent editor={editor} className="prose-editor" />
        {/* Dialog for button insertion */}
        <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Button</DialogTitle>
              <DialogDescription>
                Add a clickable button with a link to your content.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="button-text">Button Text</Label>
                <Input
                  id="button-text"
                  placeholder="Click here"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="button-href">Button Link (URL)</Label>
                <Input
                  id="button-href"
                  placeholder="https://example.com"
                  value={buttonHref}
                  onChange={(e) => setButtonHref(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setButtonDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInsertButton}
                disabled={!buttonText || !buttonHref}
              >
                Insert Button
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MediaPicker
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(img) => {
            editor
              .chain()
              .focus()
              .setImage({ src: img.url, alt: img.alt, title: img.title })
              .run();
            setMediaOpen(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
