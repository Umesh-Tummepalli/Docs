import OrderedList from "@tiptap/extension-ordered-list";

const typeToStyleMap = {
  "1": "decimal",
  "a": "lower-alpha",
  "A": "upper-alpha",
  "i": "lower-roman",
  "I": "upper-roman",
};

const styleToTypeMap = {
  "decimal": "1",
  "lower-alpha": "a",
  "upper-alpha": "A",
  "lower-roman": "i",
  "upper-roman": "I",
};

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "decimal",
        parseHTML: (element) => {
          const rawType = element.getAttribute("type");
          const mappedFromType = rawType ? (typeToStyleMap[rawType] || rawType) : null;

          return (
            element.getAttribute("data-list-style") ||
            mappedFromType ||
            element.style.listStyleType ||
            "decimal"
          );
        },
        renderHTML: (attributes) => {
          const style = attributes.listStyleType || "decimal";
          const htmlType = styleToTypeMap[style] || "1";
          return {
            "data-list-style": style,
            type: htmlType,
            style: `list-style-type: ${style}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      // Support toggling on, toggling off, or switching ordered list styles
      toggleOrderedList:
        (listStyleType = "decimal") =>
        ({ editor, commands }) => {
          const currentStyle =
            editor.getAttributes(this.name).listStyleType || "decimal";

          if (editor.isActive(this.name) && currentStyle === listStyleType) {
            // Same style active — toggle list off
            return commands.toggleList(
              this.name,
              this.options.itemTypeName,
              this.options.keepMarks
            );
          }

          if (editor.isActive(this.name)) {
            // Different ordered list style — update list attribute
            return commands.updateAttributes(this.name, { listStyleType });
          }

          // Not an ordered list — toggle ordered list on and set style attribute
          return (
            commands.toggleList(
              this.name,
              this.options.itemTypeName,
              this.options.keepMarks
            ) && commands.updateAttributes(this.name, { listStyleType })
          );
        },
    };
  },
});

