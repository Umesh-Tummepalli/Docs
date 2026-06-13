import { useState ,useRef,useEffect} from "react"
import {cn} from "../../lib/utils"
import { Bold, ChevronDownCircleIcon, ChevronDownIcon, Highlighter, Italic, ListTodo, MessageSquarePlus, Printer, Redo2, RemoveFormattingIcon, SpellCheck, Underline, Undo2 } from "lucide-react"
import { useEditorContext } from "./context/EditorContext"
import { useEditorState } from "@tiptap/react"
import { Separator } from "../ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { SketchPicker } from 'react-color'

const ToolbarButton = ({ Icon, onClick = null, isActive = false, label, disabled = false }) => {

  return <>
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={cn(
        "h-7 min-w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] p-1 mx-1 transition-colors",
        isActive && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <Icon size={16}/>
    </button>
  </>
}


const FontFamilyButton = () => {
  const editor = useEditorContext();
  const fonts = [
    { label: "Arial", value: "Arial" },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
  ]

  const { currentFontFamily } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      currentFontFamily: currentEditor?.getAttributes("textStyle").fontFamily || "Arial",
    }),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`h-7 w-30 shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm`}>
          <span className="truncate text-sm whitespace-nowrap">
            {currentFontFamily}
          </span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0"/>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {
          fonts.map(({ label, value }) => {
            return (
              <button key={value}
                className={cn(
                  "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80",
                  currentFontFamily === value && 'bg-neutral-200/80'
                )}
                style={{ fontFamily: value }}
                onClick={() => {
                  editor?.chain().focus().setFontFamily(value).run();
                }}
              >
                <span className="text-sm">
                  {label}
                </span>
              </button>
            )
          })
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const HighlightButton = () => {
  const editor = useEditorContext();

  const [panelOpen, setPanelOpen] = useState(false);
  const [color, setColor] = useState("#faf594");

  const wrapperRef = useRef(null);

  const PRESET_COLORS = [
    "#faf594",
    "#f28b82",
    "#fbbc04",
    "#ccff90",
    "#a7ffeb",
    "#aecbfa",
    "#d7aefb",
  ];

  const { isHighlighted, highlightColor } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      highlightColor: editor.getAttributes("highlight").color,
      isHighlighted: editor.isActive("highlight"),
    }),
  });

  useEffect(() => {
    if (highlightColor) {
      setColor(highlightColor);
    }
  }, [highlightColor]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const applyHighlight = (selectedColor) => {
    editor
      ?.chain()
      .focus()
      .setHighlight({ color: selectedColor })
      .run();
  };

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center"
    >
      {/* Apply Current Color */}
      <button
        className={cn(
          "flex h-8 items-center justify-center rounded-l-md px-2 hover:bg-[#e2e7eb]",
          isHighlighted &&
            "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
        )}
        onClick={() => applyHighlight(color)}
      >
        <div className="relative flex items-center justify-center">
          <Highlighter size={16} />

          <div
            className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
            style={{
              backgroundColor:
                highlightColor || color,
            }}
          />
        </div>
      </button>

      {/* Dropdown Toggle */}
      <button
        className={cn(
          "h-8 rounded-r-md px-1 hover:bg-[#e2e7eb]",
          isHighlighted &&
            "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
        )}
        onClick={() =>
          setPanelOpen((prev) => !prev)
        }
      >
        <ChevronDownIcon size={14} />
      </button>

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border bg-white p-3 shadow-lg">
          {/* Preset Colors */}
          <div className="mb-3">
            <p className="mb-2 text-xs text-gray-500">
              Presets
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: preset,
                  }}
                  onClick={() => {
                    setColor(preset);
                    applyHighlight(preset);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <SketchPicker
            color={color}
            onChangeComplete={(c) => {
              setColor(c.hex);
              applyHighlight(c.hex);
            }}
          />

          {/* Remove Highlight */}
          <button
            className="mt-3 w-full rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => {
              editor
                ?.chain()
                .focus()
                .unsetHighlight()
                .run();

              setPanelOpen(false);
            }}
          >
            Remove Highlight
          </button>
        </div>
      )}
    </div>
  );
};
const HeadingButton = () => {
  const editor = useEditorContext();
  const options = [
    { label: "Normal text", value: "paragraph" },
    { label: "Heading 1", value: 1 },
    { label: "Heading 2", value: 2 },
    { label: "Heading 3", value: 3 },
    { label: "Heading 4", value: 4 },
    { label: "Heading 5", value: 5 },
  ];

  const { currentLabel, activeBlock } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return {
          currentLabel: "Normal text",
          activeBlock: "paragraph",
        };
      }

      const activeHeading = options.find(
        ({ value }) =>
          typeof value === "number" &&
          currentEditor.isActive("heading", { level: value })
      );

      if (activeHeading) {
        return {
          currentLabel: activeHeading.label,
          activeBlock: activeHeading.value,
        };
      }

      return {
        currentLabel: "Normal text",
        activeBlock: "paragraph",
      };
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`h-7 w-32 shrink-0 flex items-center justify-between rounded-sm hover:bg-neutral-200/80 px-1.5 overflow-hidden text-sm`}>
          <span className="truncate">{currentLabel}</span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {options.map(({ label, value }) => {
          const active = activeBlock === value;

          return (
            <button
              key={label}
              className={cn(
                "flex items-center gap-x-2 px-2 py-1 rounded-sm hover:bg-neutral-200/80 text-left",
                active && "bg-neutral-200/80"
              )}
              onClick={() => {
                if (value === "paragraph") {
                  editor?.chain().focus().setParagraph().run();
                } else {
                  editor?.chain().focus().setHeading({ level: value }).run();
                }
              }}
            >
              <span className=""
                style={{
                  fontSize:
                    value === "paragraph"
                      ? "14px"
                      : value === 1
                        ? "32px"
                        : value === 2
                          ? "24px"
                          : value === 3
                            ? "20px"
                            : value === 4
                              ? "16px"
                              : "14px",
                }}
              >{label}</span>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ToolBar = () => {
  const editor = useEditorContext();
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);

  const toggleSpellcheck = () => {
    if (!editor) return;

    const nextSpellcheck = !spellcheckEnabled;
    const editorDom = document
      .getElementById("document")
      ?.querySelector("[contenteditable='true']");

    editorDom?.setAttribute("spellcheck", String(nextSpellcheck));
    editorDom?.setAttribute("autocorrect", nextSpellcheck ? "on" : "off");
    editorDom?.setAttribute("lang", editorDom.getAttribute("lang") || "en-US");

    setSpellcheckEnabled(nextSpellcheck);
    editor.commands.focus();
  };

  const { canUndo, canRedo, isBoldActive, isItalicActive, isUnderlineActive,isTodoActive } = useEditorState({
  editor,
  selector: ({ editor: currentEditor }) => {
    return {
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      isBoldActive: currentEditor?.isActive("bold") ?? false,
      isItalicActive: currentEditor?.isActive("italic") ?? false,
      isUnderlineActive: currentEditor?.isActive("underline") ?? false,
      isTodoActive: currentEditor?.isActive("taskList") ?? false,
    }
  },
  })


  const sections = [[
  {
      label: "undo",
      Icon: Undo2,
      disabled: !canUndo,
      onClick: () => {
        editor?.chain().focus().undo().run()
      }
    },
    {
      label: "redo",
      Icon : Redo2,
      disabled: !canRedo,
      onClick: () => {
        editor?.chain().focus().redo().run()
      }
    },
    {
      label: "print",
      Icon: Printer,
      onClick: () => {
        window.print();
      }
    },
    {
      label: "spell-check",
      Icon: SpellCheck,
      isActive: spellcheckEnabled,
      onClick: toggleSpellcheck
    },
  ],

   [
    {
      label: "bold",
      Icon: Bold,
      isActive: isBoldActive,
      onClick : () => {
        editor?.chain().focus().toggleBold().run();
      }
    },
    {
      label: "italic",
      Icon: Italic,
      isActive: isItalicActive,
      onClick: () => {
        editor?.chain().focus().toggleItalic().run();
      }
    },
    {
      label: "underline",
      Icon: Underline,
      isActive: isUnderlineActive,
      onClick: () => {
        editor?.chain().focus().toggleUnderline().run();
      }
     },
    ],
    [
      {
        label: "comment",
        Icon: MessageSquarePlus,
        onClick: () => {
          console.log("comment");
       }
      },
      {
        label: "todo",
        Icon: ListTodo,
        onClick: () => {
          editor?.chain().focus().toggleTaskList().run();
        },
        isActive:isTodoActive,
      },
      {
        label: "remove-formatting",
        Icon: RemoveFormattingIcon,
        onClick: () => {
          editor?.chain().focus().unsetAllMarks().clearNodes().run();
        }
      }
   ]
    ]
  return <>
    <div className="sticky top-20 z-40  ">
      <div className="mx-auto flex w-fit max-w-full items-center rounded-full bg-[#f9fbfd] p-1 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center">
          {sections[0]?.map((item) => {
            return <ToolbarButton key={item.label} {...item} />
          })}
          <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
        </div>
        <FontFamilyButton />
        <HeadingButton />
        <HighlightButton/>
        <div className="flex items-center">
          {sections[1]?.map((item) => {
            return <ToolbarButton key={item.label} {...item} />
          })}
          <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
        </div>
        <div className="flex items-center">
          {sections[2]?.map((item) => {
            return <ToolbarButton key={item.label} {...item} />
          })}
        </div>
      </div>
    </div>
  </>
}
export default ToolBar;
