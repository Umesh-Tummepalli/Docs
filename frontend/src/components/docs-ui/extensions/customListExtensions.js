import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { Extension } from '@tiptap/core'

export const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "disc",
        parseHTML: (element) => element.style.listStyleType || "disc",
        renderHTML: (attributes) => {
          if (!attributes.listStyleType || attributes.listStyleType === "disc") {
            return {};
          }

          return {
            style: `list-style-type: ${attributes.listStyleType}`,
          };
        },
      },
    };
  },
});

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "decimal",
        parseHTML: (element) => element.style.listStyleType || "decimal",
        renderHTML: (attributes) => {
          if (!attributes.listStyleType || attributes.listStyleType === "decimal") {
            return {};
          }

          return {
            style: `list-style-type: ${attributes.listStyleType}`,
          };
        },
      },
    };
  },
});


export const LineHeight = Extension.create({
  name: 'lineHeight',

  // 1. Define the types of nodes this extension applies to
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: 'normal',
    }
  },

  // 2. Extend the global schema attributes for those nodes
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            // Parse the line-height property from HTML
            parseHTML: element => element.style.lineHeight || this.options.defaultLineHeight,
            // Apply the line-height property to the HTML render output
            renderHTML: attributes => {
              if (!attributes.lineHeight || attributes.lineHeight === this.options.defaultLineHeight) {
                return {}
              }
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },

  // 3. Add custom commands to set/unset the line-height
  addCommands() {
    return {
      setLineHeight: (value) => ({ commands }) => {
        return this.options.types.every(type =>
          commands.updateAttributes(type, { lineHeight: value })
        )
      },
      unsetLineHeight: () => ({ commands }) => {
        return this.options.types.every(type =>
          commands.updateAttributes(type, { lineHeight: this.options.defaultLineHeight })
        )
      },
    }
  },
})
