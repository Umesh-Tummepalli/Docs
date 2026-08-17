import * as Y from 'yjs';

/**
 * Helper: Converts a ProseMirror JSON node into native Yjs XML types recursively.
 */
function jsonToYXmlNode(node) {
  if (node.type === 'text') {
    const yText = new Y.Text(node.text || '');
    if (Array.isArray(node.marks) && node.marks.length > 0) {
      node.marks.forEach((mark) => {
        if (mark.type) {
          yText.format(0, (node.text || '').length, { [mark.type]: mark.attrs || true });
        }
      });
    }
    return yText;
  }

  const yElement = new Y.XmlElement(node.type);

  // Preserve all node attributes (textAlign, lineHeight, level, etc.)
  if (node.attrs && typeof node.attrs === 'object') {
    Object.entries(node.attrs).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        yElement.setAttribute(key, val);
      }
    });
  }

  // Recursively add child nodes
  if (Array.isArray(node.content)) {
    const children = node.content.map(jsonToYXmlNode);
    yElement.insert(0, children);
  }

  return yElement;
}

/**
 * Converts title, metadata, and ProseMirror JSON into a base64 Y.Doc payload.
 *
 * @param {Object} params
 * @param {string} [params.title='Untitled Document'] - Document title
 * @param {Record<string, any>} [params.metadata={}] - Metadata key-value map
 * @param {Object} [params.prosemirrorJson] - ProseMirror/Tiptap JSON object
 * @returns {string} Encoded base64 Y.Doc binary payload
 */
export function proseJsonToYDocPayload({
  title = 'Untitled Document',
  metadata = {},
  prosemirrorJson = null,
}) {
  const ydoc = new Y.Doc();

  // Default initial document structure matching editor.getJSON()
  const targetJson = prosemirrorJson

  // 1. Populate 'prosemirror' Y.XmlFragment
  const xmlFragment = ydoc.getXmlFragment('prosemirror');
  if (Array.isArray(targetJson.content)) {
    const yChildren = targetJson.content.map(jsonToYXmlNode);
    xmlFragment.insert(0, yChildren);
  }

  // 2. Set 'title' Y.Text
  if (title) {
    ydoc.getText('title').insert(0, title);
  }

  // 3. Set 'metadata' Y.Map
  if (metadata && typeof metadata === 'object') {
    const yMetadata = ydoc.getMap('metadata');
    Object.entries(metadata).forEach(([key, value]) => {
      yMetadata.set(key, value);
    });
  }

  // 4. Return binary Base64 string payload
  const binaryUpdate = Y.encodeStateAsUpdate(ydoc);
  return Buffer.from(binaryUpdate).toString('base64');
}


/**
 * Helper: Recursively converts a Y.XmlFragment or Y.XmlElement back to ProseMirror JSON.
 */
function yXmlNodeToJson(yNode) {
  const content = [];

  for (let i = 0; i < yNode.length; i++) {
    const child = yNode.get(i);

    if (child instanceof Y.YText) {
      // Extract formatted text with marks
      const textJSON = child.toDelta();
      textJSON.forEach((delta) => {
        const textNode = { type: 'text', text: delta.insert };
        if (delta.attributes) {
          textNode.marks = Object.entries(delta.attributes).map(([type, attrs]) => ({
            type,
            ...(typeof attrs === 'object' ? { attrs } : {}),
          }));
        }
        content.push(textNode);
      });
    } else if (child instanceof Y.XmlElement) {
      const elementNode = {
        type: child.nodeName,
        attrs: child.getAttributes(),
      };

      const childContent = yXmlNodeToJson(child);
      if (childContent.length > 0) {
        elementNode.content = childContent;
      }

      content.push(elementNode);
    }
  }

  return content;
}

/**
 * Parses a Y.Doc instance, Base64 string, or Buffer into title, metadata, and prosemirrorJson.
 *
 * @param {Y.Doc | string | Buffer} input - Y.Doc instance, base64 payload, or Buffer
 * @returns {{ title: string, metadata: Record<string, any>, prosemirrorJson: Object }}
 */
export function parseYDocToProseJson(input) {
  let ydoc;

  if (input instanceof Y.Doc) {
    ydoc = input;
  } else {
    ydoc = new Y.Doc();
    const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
    Y.applyUpdate(ydoc, new Uint8Array(buffer));
  }

  // 1. Extract Title
  const title = ydoc.getText('title').toString();

  // 2. Extract Metadata
  const metadata = ydoc.getMap('metadata').toJSON();

  // 3. Extract ProseMirror JSON Tree
  const xmlFragment = ydoc.getXmlFragment('prosemirror');
  const prosemirrorJson = {
    type: 'doc',
    content: yXmlNodeToJson(xmlFragment),
  };

  return {
    title,
    metadata,
    prosemirrorJson,
  };
}