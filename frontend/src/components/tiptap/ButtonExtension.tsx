import { Node, mergeAttributes } from "@tiptap/core";

export interface ButtonOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      setButton: (options: { href: string; text: string }) => ReturnType;
    };
  }
}

export const ButtonExtension = Node.create<ButtonOptions>({
  name: "button",

  group: "block",

  content: "inline*",

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => {
          if (!attributes.href) {
            return {};
          }
          return {
            href: attributes.href,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="button"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "button",
        class: "editor-button",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setButton:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              href: options.href,
            },
            content: [
              {
                type: "text",
                text: options.text,
              },
            ],
          });
        },
    };
  },
});
