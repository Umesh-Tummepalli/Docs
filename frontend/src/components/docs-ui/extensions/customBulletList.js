import BulletList from "@tiptap/extension-bullet-list";

export const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "disc",
        parseHTML: (element) =>
          element.getAttribute("data-list-style") ||
          element.getAttribute("type") ||
          element.style.listStyleType ||
          "disc",
        renderHTML: (attributes) => {
          const style = attributes.listStyleType || "disc";
          return {
            "data-list-style": style,
            type: style,
            style: `list-style-type: ${style}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      // Support toggling on, toggling off, or switching list styles
      toggleBulletList:
        (listStyleType = "disc") =>
        ({ editor, commands }) => {
          const currentStyle =
            editor.getAttributes(this.name).listStyleType || "disc";

          if (editor.isActive(this.name) && currentStyle === listStyleType) {
            // Same style active — toggle list off
            return commands.toggleList(
              this.name,
              this.options.itemTypeName,
              this.options.keepMarks
            );
          }

          if (editor.isActive(this.name)) {
            // Different bullet list style — update list attribute
            return commands.updateAttributes(this.name, { listStyleType });
          }

          // Not a bullet list — toggle bullet list on and set style attribute
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

